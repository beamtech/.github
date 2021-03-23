const github = require('@actions/github')
const core = require('@actions/core')

const { context } = github

const githubToken = core.getInput('githubToken')
const octokit = github.getOctokit(githubToken)

const postMessage = async msg => {
  await octokit.issues.createComment({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body: `${msg} (E2E status check)`,
  })
}

const warn = postMessage

const fail = async msg => {
  await postMessage(msg)
  console.error(msg)
  process.exit(1)
}

const getComments = async () =>
  (
    await octokit.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.number,
    })
  ).data

const getLatestE2Ecomment = comments =>
  comments
    .filter(c => c.body.trim().indexOf('e2e ') === 0)
    .sort(function (a, b) {
      if (a.created_at < b.created_at) return 1
      if (a.created_at > b.created_at) return -1
      return 0
    })[0]

const deletePreviousComments = async comments =>
  Promise.all(
    comments.map(c => {
      if (c.body.indexOf('E2E status check') > -1) {
        console.log('deleting comment', c.id)
        octokit.issues.deleteComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: c.id,
        })
      }
    }),
  )

const getCommits = async () =>
  (
    await octokit.pulls.listCommits({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: context.payload.number,
    })
  ).data

const run = async () => {
  const comments = await getComments()
  const latestE2EComment = getLatestE2Ecomment(comments)
  await deletePreviousComments(comments)
  const commits = await getCommits()

  if (!latestE2EComment) {
    await fail(
      '❌ E2E has not been run on this PR. If E2E is needed for this PR, please run it by commenting `e2e start <options>`',
    )
  } else {
    const commitsAfterE2EComment = commits.filter(
      c => c.commit.committer.date > latestE2EComment.created_at,
    )
    if (commitsAfterE2EComment.length) {
      await warn(
        '⚠️ Commits have been pushed since E2E was last run on this PR. If E2E is needed for this PR, please run it again by commenting `e2e start <options>`.',
      )
    }
  }
}

run()

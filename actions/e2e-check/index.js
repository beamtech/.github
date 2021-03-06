const github = require('@actions/github')
const core = require('@actions/core')

const { context } = github
const { owner, repo } = context.repo

const githubToken = core.getInput('githubToken')
const octokit = github.getOctokit(githubToken)

const TRIGGER_COMMAND = 'e2e start'
const IGNORE_COMMAND = 'e2e ignore'
const STATUS_MARKER = '::E2E Check::'
const INSTRUCTIONS = `If E2E is needed for this PR, please run it by commenting \`${TRIGGER_COMMAND} <options>\`. If this PR will not need E2E, you can ignore any future notifications by commenting \`${IGNORE_COMMAND}\`.`

const IGNORE_BRANCH_PREFIXES = ['dependabot/', 'renovate/']

console.log(context)
const issue_number = context.payload.number || context.issue.number
const branchName =
  context.payload.pull_request &&
  context.payload.pull_request.head &&
  context.payload.pull_request.head.ref
const shouldIgnoreBranch =
  branchName &&
  (IGNORE_BRANCH_PREFIXES.find(prefix => branchName.startsWith(prefix)) ||
    branchName.indexOf('skip-e2e/') > -1)

console.log(branchName)

const getComments = async () =>
  (
    await octokit.issues.listComments({
      owner,
      repo,
      issue_number,
    })
  ).data

const getLatestE2Ecomment = comments =>
  comments
    .filter(c => c.body.trim().startsWith(TRIGGER_COMMAND))
    .sort(function (a, b) {
      if (a.created_at < b.created_at) return 1
      if (a.created_at > b.created_at) return -1
      return 0
    })[0]

const deleteComment = async c => {
  if (c) {
    console.log('deleting comment', c.id)
    return octokit.issues.deleteComment({
      owner,
      repo,
      comment_id: c.id,
    })
  }
}

const getCommits = async () =>
  (
    await octokit.pulls.listCommits({
      owner,
      repo,
      pull_number: issue_number,
    })
  ).data

const run = async () => {
  const comments = await getComments()
  const previousStatusComment = comments.find(
    c => c.body.indexOf(STATUS_MARKER) > -1,
  )
  const shouldIgnore = !!comments.find(c =>
    c.body.trim().startsWith(IGNORE_COMMAND),
  )
  const latestE2EComment = getLatestE2Ecomment(comments)
  const commits = await getCommits()
  const commitsAfterE2EComment = latestE2EComment
    ? commits.filter(c => c.commit.committer.date > latestE2EComment.created_at)
    : []

  const updateStatusComment = async msg => {
    const commonOpts = {
      owner,
      repo,
      body: `${msg} - ${STATUS_MARKER}`,
    }
    return previousStatusComment
      ? octokit.issues.updateComment({
          ...commonOpts,
          comment_id: previousStatusComment.id,
        })
      : octokit.issues.createComment({
          ...commonOpts,
          issue_number: context.issue.number,
        })
  }

  const updateStatus = async (state, msg) =>
    octokit.rest.repos.createCommitStatus({
      owner,
      repo,
      sha: commits[commits.length - 1].sha,
      state,
      description: msg,
      context: 'e2e-status',
    })

  const warn = async msg => {
    await updateStatusComment(`⚠️ ${msg} ${INSTRUCTIONS}`)
    return updateStatus('success')
  }

  const fail = async msg => {
    await updateStatusComment(`❌ ${msg} ${INSTRUCTIONS}`)
    return updateStatus('error', msg)
  }

  const clear = async () => {
    await deleteComment(previousStatusComment)
    return updateStatus('success', '')
  }

  if (shouldIgnore || shouldIgnoreBranch) return clear()

  if (!latestE2EComment) return fail('E2E has not been run on this PR.')

  if (commitsAfterE2EComment.length)
    return warn('Commits have been pushed since E2E was last run on this PR.')

  return clear()
}

run()

const github = require('@actions/github')
const core = require('@actions/core')
const rules = require('../rules')

const { context } = github
const { owner, repo } = context.repo
const ownerAndRepo = { owner, repo }

const githubToken = core.getInput('githubToken')
const octokit = github.getOctokit(githubToken)

// const issue_number = context.payload.number || context.issue.number
const processPR = async prNumber => {
  console.log(`processing PR #${prNumber}`)

  const pullParams = { ...ownerAndRepo, pull_number: prNumber }

  const listLabelsOnIssue = await octokit.issues.listLabelsOnIssue({
    ...ownerAndRepo,
    issue_number: prNumber,
  })
  const labels = listLabelsOnIssue.data.map(l => l.name)
  const specificRequestedTeam =
    context.payload &&
    context.payload.requested_team &&
    context.payload.requested_team.name
  const requestedReviewers = specificRequestedTeam
    ? [specificRequestedTeam]
    : (
        await octokit.rest.pulls.listRequestedReviewers(pullParams)
      ).data.teams.map(t => t.name)
  console.log({ requestedReviewers, labels, rules })
  rules.forEach(r => {
    const matchesBot = requestedReviewers.includes(r.botName)
    const matchesLabel =
      !r.includeLabels.length || r.includeLabels.find(l => labels.includes(l))
    const matchesIgnoredLabel = r.ignoreLabels.find(l => labels.includes(l))
    console.log({ matchesBot, matchesLabel, matchesIgnoredLabel })
    if (matchesBot && matchesLabel && !matchesIgnoredLabel) {
      console.log('DO ACTION!!!')
    }
  })
  // console.log(
  //   await octokit.rest.pulls.requestReviewers({
  //     ...pullParams,
  //     team_reviewers: ['ownership_test'],
  //   }),
  // )
}

const run = async () => {
  ;(await octokit.rest.pulls.list(ownerAndRepo)).data.forEach(pr =>
    processPR(pr.number),
  )
}

run()

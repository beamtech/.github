const github = require('@actions/github')
const core = require('@actions/core')
const rules = require('../rules')

const { context } = github
const { owner, repo } = context.repo

const githubToken = core.getInput('githubToken')
const octokit = github.getOctokit(githubToken)

const ownerAndRepo = {
  owner: context.repo.owner,
  repo: context.repo.repo,
}

const issue_number = context.payload.number || context.issue.number

const pullParams = {
  ...ownerAndRepo,
  pull_number: issue_number,
}

console.log(context)

const run = async () => {
  const listLabelsOnIssue = await octokit.issues.listLabelsOnIssue({
    ...ownerAndRepo,
    issue_number,
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

run()

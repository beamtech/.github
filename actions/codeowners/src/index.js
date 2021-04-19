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

const run = async () => {
  console.log(issue_number, ownerAndRepo)
  const listLabelsOnIssue = await octokit.issues.listLabelsOnIssue({
    ...ownerAndRepo,
    issue_number,
  })
  console.log(listLabelsOnIssue)
  const labels = listLabelsOnIssue.data.map(l => l.name)
  console.log(labels)
  const specificRequestedTeam =
    context.payload &&
    context.payload.requested_team &&
    context.payload.requested_team.name
  const requestedReviewers = specificRequestedTeam
    ? [specificRequestedTeam]
    : (
        await octokit.rest.pulls.listRequestedReviewers(pullParams)
      ).data.teams.map(t => t.name)
  console.log('requestedReviewers', requestedReviewers)
  // console.log(
  //   await octokit.rest.pulls.requestReviewers({
  //     ...pullParams,
  //     team_reviewers: ['ownership_test'],
  //   }),
  // )
}

run()

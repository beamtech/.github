const github = require('@actions/github')
const core = require('@actions/core')

const { context } = github
const { owner, repo } = context.repo

const githubToken = core.getInput('githubToken')
const octokit = github.getOctokit(githubToken)

const run = async () => {
  const labels = await octokit.issues.listLabelsOnIssue({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
  })
  console.log(labels)
  console.log(context.payload.requested_team.name)
  console.log(context)
  octokit.rest.pulls.requestReviewers({
    pull_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    team_reviewers: ['ownership_test'],
  })
}

run()

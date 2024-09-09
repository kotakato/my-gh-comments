type User = {
  login: string;
};

type PullRequest = {
  number: number;
  repository: {
    name: string;
    nameWithOwner: string;
  };
  title: string;
  url: string;
};

type Comment = {
  author: User;
  body: string;
  createdAt: string;
};

type Review = {
  author: User;
  body: string;
  state: string;
  submittedAt: string;
};

type ReviewComment = {
  user: User;
  body: string;
  created_at: string;
};

type GenericComment = {
  pullRequest: PullRequest;
  username: string;
  body: string;
  timestamp: Date;
};

async function getUsername(): Promise<string> {
  return (await runCommandAndParseAsJson<User>(["api", "user"])).login;
}

async function getCommentedPrs(username: string): Promise<PullRequest[]> {
  return await runCommandAndParseAsJson<PullRequest[]>([
    "search",
    "prs",
    "--commenter",
    username,
    "--json",
    "url,repository,title,number",
  ]);
}

async function getComments(pr: PullRequest): Promise<GenericComment[]> {
  type PullRequestDetail = {
    comments: Comment[];
    reviews: Review[];
  };
  const detail = await runCommandAndParseAsJson<PullRequestDetail>([
    "pr",
    "view",
    pr.url,
    "--comments",
    "--json",
    "comments,reviews",
  ]);
  const reviewComments = await runCommandAndParseAsJson<ReviewComment[]>([
    "api",
    `repos/${pr.repository.nameWithOwner}/pulls/${pr.number}/comments`,
  ]);

  const comments: GenericComment[] = [
    ...detail.comments.map((comment) => ({
      pullRequest: pr,
      username: comment.author.login,
      body: comment.body,
      timestamp: new Date(comment.createdAt),
    })),
    ...detail.reviews.map((review) => ({
      pullRequest: pr,
      username: review.author.login,
      body: `[${review.state}] ${review.body}`,
      timestamp: new Date(review.submittedAt),
    })),
    ...reviewComments.map((comment) => ({
      pullRequest: pr,
      username: comment.user.login,
      body: comment.body,
      timestamp: new Date(comment.created_at),
    })),
  ];

  return comments;
}

async function runCommandAndParseAsJson<T>(args: string[]): Promise<T> {
  console.error(["gh", ...args].join(" "));
  const command = new Deno.Command("gh", {
    args,
  });

  const { code, stdout, stderr } = await command.output();
  if (code !== 0) {
    throw new Error(new TextDecoder().decode(stderr));
  }
  return JSON.parse(new TextDecoder().decode(stdout));
}

const username = await getUsername();

const commentedPrs = await getCommentedPrs(username);

const comments = (
  await Promise.all(commentedPrs.map((pr) => getComments(pr)))
).flat();

const myComments = comments
  .filter((comment) => comment.username === username)
  .toSorted((a, b) => a.timestamp.getTime() - b.timestamp.getTime()); // Sort by timestamp in ascending order

let previousPr = null;
for (const comment of myComments) {
  if (previousPr !== comment.pullRequest) {
    console.log(
      "======================================================================"
    );
    console.log(comment.pullRequest.title);
    console.log(comment.pullRequest.url);
    console.log();
    previousPr = comment.pullRequest;
  }
  console.log("--------------------------------------------------");
  console.log(`${comment.username} (${comment.timestamp.toLocaleString()})`);
  console.log(comment.body);
  console.log();
}

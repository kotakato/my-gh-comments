# my-gh-comments

Tiny Deno script to list comments by myself on a GitHub pull request. The script uses GitHub CLI `gh` to fetch the comments internally.

## Setup

1. Install [Deno](https://deno.land/).
2. Configure GitHub CLI `gh` and get authenticated.

## Usage

```sh
deno run --allow-run=gh https://github.com/kotakato/my-gh-comments/raw/main/my-gh-comments.ts
```

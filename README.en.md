<p align="center">
  <img src="./public/branding/algorithmhub-wordmark.svg" alt="AlgorithmHub" width="520" />
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license"/></a>
  <a href="https://github.com/dev-minsoo/AlgorithmHub/releases"><img src="https://img.shields.io/github/v/release/dev-minsoo/AlgorithmHub?display_name=tag" alt="release"/></a>
</p>

<p align="center">
  A Chrome extension that automatically syncs accepted
  <strong>LeetCode</strong> and <strong>Programmers</strong> submissions to GitHub.
</p>

<p align="center">
  <a href="./README.md">한국어</a>
  ·
  <a href="https://github.com/dev-minsoo/AlgorithmHub/issues">Issues</a>
</p>

## What Is AlgorithmHub?

AlgorithmHub is a Chrome extension for people who want to keep their coding
practice repository up to date without manually copying files after every
accepted submission.

It connects your GitHub repository and automatically saves accepted solutions
from:

- LeetCode
- Programmers

## Highlights

- Sync accepted submissions directly to GitHub
- Use one extension for both LeetCode and Programmers
- Create a new repository or connect an existing one
- Customize repository path templates by platform
- Keep a clean root README with platform-based summary

## How does AlgorithmHub work?

1. Connect your GitHub account and repository
2. Solve a problem on LeetCode or Programmers
3. Submit an accepted solution
4. Let AlgorithmHub sync the solution files to GitHub automatically

| LeetCode Demo | Programmers Demo |
| --- | --- |
| ![LeetCode demo](./docs/leetcode-demo.gif) | ![Programmers demo](./docs/programmers-demo.gif) |

## Usage

1. Open the extension popup
2. Authenticate with GitHub
3. Create a repository or connect an existing one
4. Solve a problem on LeetCode or Programmers
5. Submit an accepted solution
6. Let AlgorithmHub sync it to GitHub

## How to Set Up AlgorithmHub for Local Development

```bash
npm install
npm run build
npm run lint
```

Then in Chrome:

1. Open `chrome://extensions`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select the `dist/` directory

## Contributing

Contributions are welcome.

If you want to improve AlgorithmHub, you can contribute by reporting bugs,
requesting features, or opening pull requests.

### Issue Guide

- Create an issue before starting larger changes
- Use these prefixes for issue titles:
  - `bug:` for bug reports
  - `feat:` for feature requests
- Include reproduction steps, expected behavior, and screenshots when relevant

### Pull Request Guide

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm run build`
5. Open a pull request with a clear summary
6. Link the related issue if one exists

Use these prefixes for pull request titles:

- `fix:` for bug fixes
- `feat:` for new features
- `chore:` for maintenance, cleanup, and non-user-facing updates

## Issues

If you found a bug or want to request a feature, open an issue:

- https://github.com/dev-minsoo/AlgorithmHub/issues

## Inspired by

- [BaekjoonHub](https://github.com/BaekjoonHub/BaekjoonHub)
- [LeetHub](https://github.com/QasimWani/LeetHub)

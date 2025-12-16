# Contributing to *Cut the Rope: H5DX*

Thank you for your interest in contributing! Please take a moment to review this guide before submitting issues, feature requests, translation contributions, or pull requests.

> [!NOTE]
> This guide is not exhaustive. Project practices may evolve, and new situations may arise. When in doubt, feel free to ask questions or open an issue for clarification.

## 📬 Submitting issues, feature requests, and translations

To report bugs or request features, please [open an issue](https://github.com/yell0wsuit/cuttherope-h5dx/issues/new/choose) and choose the appropriate category.

## 🔀 Submitting pull requests

### ✅ What you should do

- **Use a modern code editor** (e.g., Visual Studio Code) with Prettier and ESLint extensions enabled for consistent formatting and linting.

- **Format your code** before committing and pushing. You must use **Prettier with our configuration** to ensure consistent formatting.

- **Test your code thoroughly** before pushing. Resolve any ESLint errors if possible.

- **Use clear, concise variable names** written in `camelCase`. Names should be self-explanatory, avoid abbreviations, and reflect the variable’s intent or data type.

- **Use a clear, concise pull request title**. If possible, we recommend following [semantic commit message conventions](https://gist.github.com/joshbuchea/6f47e86d2510bce28f8e7f42ae84c716). Examples:
  - `fix: handle audio timeout error on older devices`
  - `feat: add pitch detection to feedback view`

  If the title doesn’t fully describe your changes, please provide a detailed description in the PR body.

- If you are working on your changes and they are not ready yet, consider using a **draft pull request**, and prefix the title with `[WIP]` (Work In Progress). When you feel it is ready, remove it and mark the PR as ready.

- If your pull request is outdated compared to the main branch, we recommend rebasing it to keep the commit history linear. Merging `main` into your branch is discouraged, as it can introduce unnecessary merge commits and make the history harder to review.

  - If any of your changes conflict with the main branch, resolve the conflicts manually and ensure the final result is compatible with the current codebase.

- Use **multiple small commits** with clear messages when possible. This improves readability and makes it easier to review specific changes.

- Before submitting a **large pull request** or major change, open an issue first and select the appropriate category. After a review by our team, you can start your work.

- After completing your changes, run the following commands to ensure code quality and consistency:

  ```bash
  # Format code using Prettier (most important)
  npm run format

  # Check for TypeScript errors
  npm run typecheck

  # Lint for code style issues
  npm run lint
  ```

### 🧪 Review process

- All PRs are reviewed before merging. Please be responsive to feedback.  
  When addressing comments, make a new commit with a message like:  
  `address feedback by @<username>`

### 🤔 What you should NOT do

- Submitting low-effort or noise PRs, including, but not limited to: unnecessary README edits, cosmetic documentation tweaks, or changes unrelated to an actual issue or improvement.

  - If a change does not fix a bug, add a feature, or meaningfully improve documentation, it likely does not belong in a pull request.

- Avoid submitting pull requests with **only cosmetic changes** (e.g., whitespace tweaks or code reformatting without functional impact).  
  - These changes clutter diffs and make code reviews harder. [See this comment by the Rails team](https://github.com/rails/rails/pull/13771#issuecomment-32746700).
  - Always run Prettier before committing to avoid unnecessary diffs.

- Submit a pull request with **one or several giant commit(s)**. This makes it difficult to review.

- Use unclear, vague, or default commit messages like `Update file`, `fix`, or `misc changes`.

- Modify configuration files (e.g., `.prettierrc.json`, `eslint.config.js`, etc.), or any files in the `.github` folder without prior discussion.

### 🚫 Prohibited actions

- Add code that is unclear in intent or function.
- Add code or commits that:
  - Are **malicious** or **unsafe**  
  - **Executes scripts from external sources** associated with malicious, unsafe, or illegal behavior  
  - Attempts to introduce **backdoors** or hidden functionality

  Any code violating these rules will result in the contributor being blocked and reported to GitHub for Terms of Service violations.

- Use expletives or offensive language. This project is intended for everyone, and we strive to maintain a respectful environment for all contributors and users.

---

Thank you again for helping us improve the project!

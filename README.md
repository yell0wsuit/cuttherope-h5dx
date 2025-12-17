# Cut the Rope: H5DX

<p align="center">
<img src="./images/ctr_pattern.webp" alt="Cut the Rope: H5DX Logo" width="400"/>
</p>

## About

*Cut the Rope: H5DX (HTML5 Deluxe)* is a fan-made enhancement of the web edition of *Cut the Rope*, originally developed by ZeptoLab. This project aims to improve the original game's codebase, add new features, and enhance the overall gaming experience.

The game's source code is originated from the Firefox OS version, which includes full source code that aids in the development of this project.

The project is currently led by [yell0wsuit](https://github.com/yell0wsuit).

> [!NOTE]
> This project is not, and will never be affiliated with or endorsed by ZeptoLab. All rights to the original game and its assets belong to ZeptoLab.

### Related project

- [Cut the Rope: DX](https://github.com/yell0wsuit/cuttherope-dx): A decompiled C# version of the game, currently being developed to match with the HTML version.

## Play

You can play the game online at: <https://yell0wsuit.github.io/cuttherope-h5dx/>

## Features

- Written in [TypeScript](https://www.typescriptlang.org/), fully typed ([PR #32](https://github.com/yell0wsuit/cuttherope-h5dx/pull/32))
- New loading system
- New boxes: Spooky Box, Steam Box
- Ported *Holiday Gift* levels, assets and animations, and Paddington-themed assets
- More in-game music, randomized
- Resolution up to HD 1080p, adapt to current screen's resolution
- Support more than 25 levels per box
  - Added 25 levels from the Round 5 promotion in the Buzz Box ([PR #33](https://github.com/yell0wsuit/cuttherope-h5dx/pull/33))
- Fixed some audio/music bugs -- see [PR #9](https://github.com/yell0wsuit/cuttherope-h5dx/pull/9) for more information
- Support loading custom sprites and animations from [TexturePacker](https://www.codeandweb.com/texturepacker) in JSON array format. This allows easier modding and adding new assets.

## Goals

### Long-term goals

- [ ] **Bugs fixing and polish**: Fix bugs, and ensure everything works smoothly.
- [ ] **Code optimization and modernization**: Optimize performance-critical code, and modernize codebase.
- [ ] **Optional goals**: Add new features like ~~level editor~~\*, custom level manager, etc.

    \* Go to <https://adriandrummis.github.io/CutTheRopeEditor/> instead, level editor seems to be too complex to be added in this game engine.

## Development & contributing

The development of *Cut the Rope: H5DX* is an ongoing process, and contributions are welcome! If you'd like to help out, please consider the following:

- **Reporting issues**: If you encounter any bugs or issues, please report them on the [GitHub Issues page](https://github.com/yell0wsuit/cuttherope-h5dx/issues).
- **Feature requests**: If you have ideas for new features or improvements, feel free to submit a feature request through Issues.
- **Contributing code**: If you're a developer and want to contribute code, please fork the repository and submit a pull request.

### Testing locally

To test the game locally during the development process, follow these steps:

1. Ensure you have the latest version of [Node.js](https://nodejs.org/) installed on your machine, preferably v20 or higher.

2. Clone the repository to your PC:

    ```bash
    git clone https://github.com/yell0wsuit/cuttherope-h5dx.git
    cd cuttherope-h5dx
    ```

    You can also use [GitHub Desktop](https://desktop.github.com/) for ease of cloning.

3. Install the required dependencies:

    ```bash
    npm install
    ```

4. Start a local development server:

    ```bash
    npm run dev
    ```

5. Open your web browser and navigate the address in the terminal to play the game locally.  
   The default address is usually `http://localhost:5173/`.

During the development process, all boxes and levels are unlocked by default, so you don't need to play through the game to test specific levels.

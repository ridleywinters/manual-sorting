# Changelog


### [1.3.7](https://github.com/Kh4f/obsidian-manual-sorting/compare/1.3.6...1.3.7) (2025-03-06)


### 🐞 Bug Fixes

* **menu:** ensure "Change sort order" click handler only applies in File Explorer ([a90690e](https://github.com/Kh4f/obsidian-manual-sorting/commit/a90690eabb5d8299b88de063aa6f7122954a4711)), closes [#6](https://github.com/Kh4f/obsidian-manual-sorting/issues/6)

### [1.3.6](https://github.com/Kh4f/obsidian-manual-sorting/compare/1.3.5...1.3.6) (2025-02-28)


### 🐞 Bug Fixes

* **ui:** change modal title to sentence case ([cb2ec6c](https://github.com/Kh4f/obsidian-manual-sorting/commit/cb2ec6c2108bdd128464ea9fedf8f83f96ef682a))


### 🛠️ Changes

* **license:** update copyright year and owner ([fbb6e76](https://github.com/Kh4f/obsidian-manual-sorting/commit/fbb6e762d294d636182c9a2179508547a5bde1fb))
* replace outdated layout ready check with modern approach ([82f2951](https://github.com/Kh4f/obsidian-manual-sorting/commit/82f2951ce72b0235f49a59a94539e6e54437987e))

### [1.3.5](https://github.com/Kh4f/obsidian-manual-sorting/compare/1.3.4...1.3.5) (2025-02-15)


### 🛠️ Changes

* **dependencies:** add i18next and update @babel/runtime ([17dc880](https://github.com/Kh4f/obsidian-manual-sorting/commit/17dc8808b431cdea7494c927488f5edcdcfefe67))
* **manifest.json:** set isDesktopOnly to true ([f200866](https://github.com/Kh4f/obsidian-manual-sorting/commit/f200866d8433d7599032858852a1a80d64109171))

### [1.3.4](https://github.com/Kh4f/obsidian-manual-sorting/compare/1.3.3...1.3.4) (2025-02-12)


### 🛠️ Changes

* add refactor and chore sections to .versionrc ([888c7c6](https://github.com/Kh4f/obsidian-manual-sorting/commit/888c7c6742280b5e87da3586c76c83d2c51f8936))
* update devDependencies to latest versions ([541c609](https://github.com/Kh4f/obsidian-manual-sorting/commit/541c609d36410c36a66afafc4810c69ca5a89ec2))


### 🐞 Bug Fixes

* **mobile:** tree.infinityScroll not found that lead to a crash by [<u>**@Mara-Li**</u>](https://github.com/Mara-Li) in [#3](https://github.com/Kh4f/obsidian-manual-sorting/pull/3) ([7b369fb](https://github.com/Kh4f/obsidian-manual-sorting/commit/7b369fb5f77131c0febd9e43ce1965a6e1b7b694))
* not working in french by [<u>**@Mara-Li**</u>](https://github.com/Mara-Li) in [#2](https://github.com/Kh4f/obsidian-manual-sorting/pull/2) ([ebb4e5d](https://github.com/Kh4f/obsidian-manual-sorting/commit/ebb4e5d9bfccb3e2b46fb283a6a0b5a3c5b8834f)), closes [#1](https://github.com/Kh4f/obsidian-manual-sorting/issues/1)

### [1.3.3](https://github.com/Kh4f/obsidian-manual-sorting/compare/1.3.2...1.3.3) (2025-02-12)


### 🛠️ Changes

* include styles.css in release workflow ([b115fff](https://github.com/Kh4f/obsidian-manual-sorting/commit/b115fff55363c10487f8f571e209a7f0f412b143))
* move modal button styles into CSS ([1a20f9e](https://github.com/Kh4f/obsidian-manual-sorting/commit/1a20f9e092d7361f00e25785f2d913bc04906dfc))

### [1.3.2](https://github.com/Kh4f/obsidian-manual-sorting/compare/1.3.1...1.3.2) (2025-02-11)

### 🛠️ Changes
- update plugin ID in `manifest.json` ([d374551](https://github.com/Kh4f/obsidian-manual-sorting/commit/d37455194018310698f9a054d5b42bf7c54e0830))

### [1.3.1](https://github.com/Kh4f/obsidian-manual-sorting/compare/1.3.0...1.3.1) (2025-02-11)

### 🛠️ Changes
- update description for clarity in `manifest.json` ([364117b](https://github.com/Kh4f/obsidian-manual-sorting/commit/364117beb82ab53f512565aed4a0c4364984a660))

## [1.3.0](https://github.com/Kh4f/obsidian-manual-sorting/compare/1.2.0...1.3.0) (2025-02-10)


### 🚀 Features

* **menu:** add emojis to custom menu options ([ce51167](https://github.com/Kh4f/obsidian-manual-sorting/commit/ce511674f982c653228e5945eca7e9a9ff36549e))


### 🐞 Bug Fixes

* add optional chaining to prevent potential null reference errors ([8c64d67](https://github.com/Kh4f/obsidian-manual-sorting/commit/8c64d679266c38036fc26e861b2011571f81584b))
* add type annotations for better type safety in menu and sorting logic ([a3d0847](https://github.com/Kh4f/obsidian-manual-sorting/commit/a3d0847d9034049c833e0a1dc4293f6eb7395676))
* replace direct prototype access with Object.getPrototypeOf for better compatibility ([d33bf5e](https://github.com/Kh4f/obsidian-manual-sorting/commit/d33bf5ece069a14475663020932e11295cba2536))

## [1.2.0](https://github.com/Kh4f/obsidian-manual-sorting/compare/1.1.0...1.2.0) (2025-02-10)


### 🚀 Features

* add 'Reset order' option to Obsidian Sort Order menu for clearing saved data ([0b095b6](https://github.com/Kh4f/obsidian-manual-sorting/commit/0b095b6a772ec32267be30f29f98cf268dff87a7))
* add confirmation modal for resetting sort order to default ([01ed06e](https://github.com/Kh4f/obsidian-manual-sorting/commit/01ed06e04b33f69bf81b24c2161e6ab30f1d5d7f))
* conditionally add 'Reset order' option to sorting menu based on manual sorting status ([19c2253](https://github.com/Kh4f/obsidian-manual-sorting/commit/19c2253af5fa5b0b4098ce8bedc46a61219b33f0))


### 🐞 Bug Fixes

* correct small spacing between buttons in confirmation modal ([fc80c2d](https://github.com/Kh4f/obsidian-manual-sorting/commit/fc80c2d0487c459011ec7dcf313a2d683ae747da))

## [1.1.0](https://github.com/Kh4f/obsidian-manual-sorting/compare/1.0.0...1.1.0) (2025-02-10)


### 🚀 Features

* add custom option for manual sorting in Sort Order menu ([7583173](https://github.com/Kh4f/obsidian-manual-sorting/commit/7583173670746020e5d76eb0c5f210a0416eb755))
* add enable/disable functionality for custom option ([05628ec](https://github.com/Kh4f/obsidian-manual-sorting/commit/05628ec49c65bfd18891dd0dfb099d6d2f99c702))
* add unpatching functionality for sort order menu on unload ([b3ff25e](https://github.com/Kh4f/obsidian-manual-sorting/commit/b3ff25eedb49f10ef0890e993bdac1b542c4a959))
* enhance initialization process by patching sort order menu and cleaning up invalid paths ([7be74d5](https://github.com/Kh4f/obsidian-manual-sorting/commit/7be74d5622678394e7d67bd4e2f012e769a145c9))
* update manual sorting menu option to reflect enabled state and reload plugin on activation ([a850371](https://github.com/Kh4f/obsidian-manual-sorting/commit/a850371225ec575a9d3f462f4f1fbaaee47d0f73))

### 🐞 Bug Fixes

* disable manual sorting when selecting another sort option ([bf987d0](https://github.com/Kh4f/obsidian-manual-sorting/commit/bf987d09776cba549904e14e10f8bbc0794a094a))

## [1.0.0](https://github.com/Kh4f/obsidian-manual-sorting/compare/0.2.0...1.0.0) (2025-02-10)


### 🚀 Features

* add unpatching functionality for file explorer on unload ([7d51c21](https://github.com/Kh4f/obsidian-manual-sorting/commit/7d51c2138749d92425df9b07808601bb1d35d827))

## [0.2.0](https://github.com/Kh4f/obsidian-manual-sorting/compare/0.1.0...0.2.0) (2025-02-10)


### 🚀 Features

* add allChildrenRendered flag to TFolder for rendering tracking ([3032919](https://github.com/Kh4f/obsidian-manual-sorting/commit/3032919494f847498a9f73a5a25ca4784e0dd675))
* add onEnd handler  for order saving on drag end ([7156d4d](https://github.com/Kh4f/obsidian-manual-sorting/commit/7156d4df26ac3275fa798792fbf1e747674aa739))
* add onRename handler to save order after renaming items ([c24a172](https://github.com/Kh4f/obsidian-manual-sorting/commit/c24a1726ca66a6086dca8ca2ae213945f4cd014f))
* add prevActualChildrenCount to TFolder for tracking child count changes ([1eb4939](https://github.com/Kh4f/obsidian-manual-sorting/commit/1eb49392f234b12f3a38a2b54960dc73d6574729))
* add reloadExplorerPlugin method to refresh file explorer state ([85cb1c4](https://github.com/Kh4f/obsidian-manual-sorting/commit/85cb1c4d2de1988664d2553d344d44c7a34130b3))
* enhance OrderManager to handle concurrent save operations with a queue ([b41003c](https://github.com/Kh4f/obsidian-manual-sorting/commit/b41003cd568e7c2e5e1ea1a37f2e4a3b55fbf29d))
* implement OrderManager for saving and restoring item order in containers ([71fc89b](https://github.com/Kh4f/obsidian-manual-sorting/commit/71fc89bd7794c0eb8dd9b389f7775abd890912f9))
* integrate OrderManager for saving and restoring item order in ManualSortingPlugin ([cf44580](https://github.com/Kh4f/obsidian-manual-sorting/commit/cf445805450a229e27efdbe72079eda8dccabe75))
* update data-path attribute for moved items manually ([f14d315](https://github.com/Kh4f/obsidian-manual-sorting/commit/f14d3159365603f6a7ff8d0cd50a0c24ef52e4ac))


### 🐞 Bug Fixes

* add cleanup for invalid paths after removing and renaming folders ([58ecaa1](https://github.com/Kh4f/obsidian-manual-sorting/commit/58ecaa18750c9743fb2731cc9fd423dd00fd380a))
* update folder path property manually on move to fix auto-update issue ([f2ebf27](https://github.com/Kh4f/obsidian-manual-sorting/commit/f2ebf27553cf6d01525b428717e2d688701523f9))

## 0.1.0 (2025-02-10)


### 🚀 Features

* add development-only logging function ([fc8d9c8](https://github.com/Kh4f/obsidian-manual-sorting/commit/fc8d9c8b3cbb6febca416c9187b01931ebffcea6))
* add initialization method ([13e2109](https://github.com/Kh4f/obsidian-manual-sorting/commit/13e21095544dcbc858e656f1179185bd8c4e08c2))
* add MutationObserver to monitor data-path attribute changes ([001bdd5](https://github.com/Kh4f/obsidian-manual-sorting/commit/001bdd5f396eec389fad865c3cb4c75ef3797883))
* add ribbon icon ([7761c1d](https://github.com/Kh4f/obsidian-manual-sorting/commit/7761c1dc5c31d8463b48917769e1ad5be18eda8f))
* implement file explorer patching using monkey-around ([6e027d1](https://github.com/Kh4f/obsidian-manual-sorting/commit/6e027d1c6deb65f3b48581441a353db254cae9a3))
* implement manual sorting functionality using SortableJS ([a74fd76](https://github.com/Kh4f/obsidian-manual-sorting/commit/a74fd76165031364cc1bce688d72ba731c874754))


### 🐞 Bug Fixes

* disconnect MutationObserver after processing new item ([d3ebea6](https://github.com/Kh4f/obsidian-manual-sorting/commit/d3ebea603328e2b14825544cd8075dc1f4ae2dda))
* update regex pattern to extracting first release notes from CHANGELOG.md ([1e81a09](https://github.com/Kh4f/obsidian-manual-sorting/commit/1e81a098ac1410f035387aa24f58a0b31a388e9f))

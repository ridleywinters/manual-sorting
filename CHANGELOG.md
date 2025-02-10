# Changelog


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

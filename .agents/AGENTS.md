# Custom Agent Rules

- **Code Editing Restriction**: Do not modify, create, or delete any source code files in the project workspace (including `BackEnd` and `FrontEnd` source files) unless the user explicitly uses the exact phrase:
  `You have the green flag to change`
- This restriction applies even if the user says "ok change", "apply changes", or otherwise discusses implementation details and implies consent. Only the exact trigger phrase allows code modifications.Moreover for every prompt green flag prompt is required
  If the user allows green flag for one change it does not mean its a green flag for future changes as well it should be taken permission of separately

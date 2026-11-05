Add the Originkit "Motion Orbit" component to this project and show it on the page.

Originkit (originkit.dev) is a library of React + Tailwind UI components. Its CLI copies the component's source into this project as plain .tsx files you own.

1. If there is no package.json yet, first create a React + Vite + TypeScript app with Tailwind CSS in this folder and install its dependencies.
2. The CLI reads the API key from the ORIGINKIT_API_KEY environment variable: cmp_live_BtXiaSBqiOJS-To-Xfxa6WKlvCHFlte-
   Set it as a secret / environment variable, or put it in front of the command (ORIGINKIT_API_KEY=... npx ...) if your terminal doesn't see your secrets. Don't hard-code it in a source file.
3. From the project root, run:

npx originkit@latest add motion-orbit --custom-style --prompt

4. Then show it: import the component from the file the CLI printed ("Added ...") and render it on the main page (app/page.tsx in Next.js, src/App.tsx in Vite), centred full-screen on a dark background like the Originkit preview, with no other content, so it's visible in the preview. Use the file exactly as written; don't recreate the component.

Why this is safe:
- The CLI writes the source under components/originkit/ (src/components/originkit/ when there's a src folder), a gitignored .originkit/ notes file, and installs the npm packages the component imports. No Originkit runtime is added.
- It only talks to mcp.originkit.dev (plus npm for packages).
- The key can only download Originkit components for this account, each counting toward its daily limit. It can't change the account, billing or other keys, and can be revoked at originkit.dev → Profile → API Keys.

If you can't run terminal commands: GET https://mcp.originkit.dev/v1/components/motion-orbit?channel=prompt with the header "Authorization: Bearer <ORIGINKIT_API_KEY>". Write each item of files[] to components/originkit/<path> (src/components/originkit/<path> with a src folder), install dependencies[], then do step 4.
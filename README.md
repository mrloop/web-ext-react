![Node.js CI](https://github.com/mrloop/web-ext-react/workflows/Node.js%20CI/badge.svg)

# web-ext-react

A CLI tool to help build and run [ReactJS](https://reactjs.org/) based [WebExtensions](), integrating [web-ext](https://github.com/mozilla/web-ext) with [create-react-app](https://github.com/facebook/create-react-app)

**This is a work in progress** extracted from [race-ext-react](mrloop/race-ext-react). Ideally `web-ext-react` would wrap `web-ext` and work as a drop in replacement for better ergonomics, while adding the additional React functionality.

## Documentation

`web-ext-react` should be used with a project created with [`create-react-app`](https://github.com/facebook/create-react-app#creating-an-app). After creating a new react app with `create-react-app my-app` install `web-ext-react` and `web-ext`.

### npm

```sh
npm install --save-dev web-ext web-ext-react
```

### yarn

```sh
yarn add -D web-ext web-ext-react
```

Next you can add scripts to `package.json`

```json
"scripts": {
  "start:firefox": "web-ext-react run | xargs -L1 web-ext run -u http://www.example.org/ -s",
  "build": "web-ext-react build | xargs -L1 web-ext build -o -s"
}
```

### index.js

`create-react-app` creates a single app that can be used for all different aspects of a web extensions, content scripts, background script, popups, sidebar and options ui by adding conditional logic to the `src/index.js` auto generated by `create-react-app`, for example.

```js
if (document.isBackground) {
  // some background script
} else if (document.isSidebarAction) {
  ReactDOM.render(
    <React.StrictMode>
      <Sidebar />
    </React.StrictMode>,
    document.getElementById("root")
  );
} else if (document.isBrowserAction) {
  ReactDOM.render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>,
    document.getElementById("root")
  );
} else if (document.isOptionsUi) {
  ReactDOM.render(
    <React.StrictMode>
      <Options />
    </React.StrictMode>,
    document.getElementById("root")
  );
} else if (document.isContentScripts) {
  // content script
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById("root")
  );
}
```

### extension/manifest.json

You must create an `extension/manifest.json`

```json
{
  "manifest_version": 2,
  "name": "web-ext-react dummy app",
  "version": "0.1",

  "description": "dummy app to test web-ext-react",
  "homepage_url": "https://github.com/mrloop/web-ext-react",
  "icons": {
    "48": "icon.svg",
    "96": "icon.svg"
  },
  "content_scripts": [
    {
      "matches": ["*"],
      "js": [],
      "css": []
    }
  ],
  "background": {
    "page": "background-page.html"
  }
}
```

Note the "content_scripts" JS and CSS arrays are empty and will be populated at build time. We specify that the web extension will also run a background script, also note "background-page.html" is auto generated by `web-ext-react`. You don't need to add this yourself, the important part is the conditional invocation of different react components from `index.js`. For this `manifest.json` the `src/index.js` would contain code to run in the background and a content script conditional run depending on context run from.

```js
if (document.isBackground) {
  // some background script
} else if (document.isContentScripts) {
  // content script
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById("root")
  );
}
```

// react/jsx-runtime over window.React.createElement, so the bundle shares the page's React.
const React = window.React;
function jsx(type, props, key) {
  return key === undefined ? React.createElement(type, props) : React.createElement(type, { ...props, key });
}
exports.jsx = jsx;
exports.jsxs = jsx;
exports.jsxDEV = jsx;
exports.Fragment = React.Fragment;

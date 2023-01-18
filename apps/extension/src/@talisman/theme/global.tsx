import { createGlobalStyle, css } from "styled-components"

import { hideScrollbarsStyle, scrollbarsStyle } from "./styles"

const Global = createGlobalStyle`

  * {
    // TODO Check to see if this can be moved to html element
    -webkit-font-smoothing: antialiased; // applies on macOS only
  }

  // default box-sizing to border-box, recommended approach
  html {
    box-sizing: border-box;
  }
  *, *:before, *:after {
    box-sizing: inherit;
  }

  body,
  html{
      font-family: 'Surt', sans-serif;
      padding: 0;
      margin: 0;
      scroll-behavior: smooth;
      font-size: 10px;
      min-height: 100%;
      font-weight: var(--font-weight-regular);
      overflow: hidden;
  }

  // if window popup, set borders on HTML element
  html.popup {
    border: 1px solid #3f3f3f;
  }

  // if embedded popup (extension button action), set borders on #main element
  html.popup.embedded {
    border:none;    
    #main {
      border: 1px solid #3f3f3f;

      // rounded borders for firefox
      @media all and (min--moz-device-pixel-ratio:0) {
        border-radius:8px;
      }
      
    }
  }

  body{
    background: rgb(${({ theme }) => theme?.background});
    color: rgb(${({ theme }) => theme?.foreground});
    font-size: var(--font-size-normal);
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  p{
      line-height: 1.45em;
      margin: 0 0 0.75em;
      font-weight: var(--font-weight-regular);

      &.-muted{
          opacity: 0.7
      }

      a{
          line-height: inherit;
          opacity: 0.6;
          color: rgb(${({ theme }) => theme?.primary});
      }

      &[data-extended]{
        font-family: 'SurtExpanded', sans-serif;
      }
  }

  h1{
      font-family: 'SurtExpanded', sans-serif;
      font-size: var(--font-size-large);
  }

  h2{
      font-size: var(--font-size-medium);
  }

  h3,
  h4,
  h5{
      font-size: var(--font-size-normal);
  }

  p{
      font-size: var(--font-size-normal);
      line-height: 1.6em;
  }

  a{
      text-decoration: none;
      transition: all 0.15s;
  }

  hr{
      opacity: 0.15;
      height: 0;
      border: none;
      border-bottom: 1px solid currentColor;
  }

  button{
      font: inherit
  }

  strong{
      font-weight: var(--font-weight-bold);
  }

  textarea,
  input,
  .input-auto-width,
  select {
    font-family: 'Surt', sans-serif;
    font-size: var(--font-size-medium);
    line-height: 1.6em;
  }

  @keyframes spin {
      from {
          transform: rotate(0deg);
      }
      to {
          transform: rotate(360deg);
      }
  }

  svg{
    width: 1em;
    height: 1em;
    transition: all var(--transition-speed-fast) ease-in-out;

    &[data-primary="true"]{
      color: var(--color-primary)
    }

    &.feather-loader,
    &[data-spin]{
      opacity: 0.4;
      animation: spin linear 3s infinite;
    }
  }

  *:not(.allow-focus):focus{
      outline: none;
  }

  .muted{
    font-size: 0.8em;
    opacity: 0.4;
  }

  .notification-container{
    z-index: 998
  }

  .modal-container{
    z-index: 999
  }

  form[data-button-pull-left]{
    display: flex;
    flex-direction: column;
    align-items: stretch;
    >.button:last-of-type,
    >button:last-of-type{
      align-self: flex-end;
    }
  }

  .scrollbars {
    ${scrollbarsStyle()}
  }

  .hide-scrollbars {
    ${hideScrollbarsStyle}
  }
  
  .flex {
    display: flex;
    align-items: center;
  }
  
  .gap {
    gap: 1rem;
  }

  /* hides password reveal in Edge */
  input[type=password]::-ms-reveal {
    display:none;
  }

  /* revealable balances */
  .balance-revealable {
    
    position:relative;
    overflow:hidden;
    border-radius:6px;
    cursor:pointer;
    color:transparent; // transparent so text doesn't appear through transparent bg

    &.balance-reveal {
      overflow:visible;
      border-radius:0;
      color:inherit; // original text color
    }

    ::after {
      content:"";
      background-image:url(/images/blur.svg);
      opacity: 0.15;
      background-size:100% 100%;
      border-radius:6px;
      position:absolute;
      overflow:hidden;
      top:0;
      left:0;
      width:100%;
      height:100%;
    }

    &.balance-reveal::after {
      display:none;
    }
  }

`

export default Global

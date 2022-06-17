import { createGlobalStyle } from "styled-components"

const Global = createGlobalStyle`
  *{
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
      color: inherit;
      backface-visibility: hidden;
      -ms-overflow-style: none; /* IE and Edge */
      scrollbar-width: none; /* Firefox */
      &::-webkit-scrollbar {
        display: none;
      }
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
    border: 1px solid var(--color-background-muted-2x);
  }

  // if embedded popup (extension button action), set borders on #main element
  html.popup.embedded {
    border:none;    
    #main {
      border: 1px solid var(--color-background-muted-2x);

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

      /*em{
        position: relative;
        &:after{
          content: '';
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          border-top: 1px dashed currentColor;
        }
      }*/
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

  *:focus{
      outline: none;
  }

  ::placeholder {
    color: rgba(${({ theme }) => theme?.foreground}, 0.2);
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
  
  *::-webkit-scrollbar {
    width: 0.2em;
  }

  *::-webkit-scrollbar-track {
    box-shadow: inset 0 0 3px transparent;
  }

  *::-webkit-scrollbar-thumb {
    border-radius: 1em;
    background-color: var(--color-background-muted);
    outline: 1px solid transparent;
  }

  /* Works on Firefox */
  * {
    scrollbar-width: thin;
    scrollbar-color: var(--color-background-muted) transparent;
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
    color:var(--color-foreground);

    &.balance-reveal {
      overflow:visible;
      border-radius:0;
      color:inherit;
    }

    ::after {
      transition: all var(--transition-speed) ease-in;
      backdrop-filter: blur(10px);
      content:"";
      background: radial-gradient(rgba(90, 90, 90, 0.2) 0%, rgba(90, 90, 90, 0) 100%);
      border-radius:6px;
      position:absolute;
      overflow:0;
      top:0;
      left:0;
      width:100%;
      height:100%;
    }

    &.balance-reveal::after {
      backdrop-filter: blur(0);
      opacity:0;
    }
  }

  @keyframes bg-slide-x {
    0% {background-opacity: 0;}
    50% {background-opacity: 1;}
    100% {background-opacity: 0;}
    to {
      background-position: 130% 0, 0 0;
    }
  }
  

`

export default Global

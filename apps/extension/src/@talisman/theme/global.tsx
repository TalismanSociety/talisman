import { createGlobalStyle, css } from "styled-components"

import { hideScrollbarsStyle, scrollbarsStyle } from "./styles"

const Global = createGlobalStyle`



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

import { createGlobalStyle } from "styled-components"

const Global = createGlobalStyle`

  *:not(.allow-focus):focus{
      outline: none;
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

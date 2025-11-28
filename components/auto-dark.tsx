export const DARK_MODE_INJECTION = `
  (function() {
    const style = document.createElement('style');
    style.textContent = \`
      footer {
          background-color: #252525;
      }

      * {
          font-family: Inter;
          margin: 0;
          padding: 0;
          background-color: #252525;
      }

      .homeRules-module--boxWhite--861e5 {
          background: #fff0;
          border: 1px solid var(--contours, #646464);
          border-radius: 8px;
          box-shadow: 0 0 10px 0 rgba(102, 112, 133, .15);
          margin-left: 5%;
          margin-right: 5%;
          margin-top: 16px;
          padding: 24px;
      }

      .Home-module--header--7d290 {
          background: #252525;
      }

      p {
         background-color: #25252500;
      }

      img {
           background-color: #25252500;
      }

      .Home-module--subwelcome--1badb {
           color: #fff; 
      }

      .homeRules-module--titleRule--93d0b {
           color: #fff;
      }

      .homeRules-module--libRules--65e71{
           color: #fff; 
      }

      .HeaderSolde-module--boxgris--ab173 {
          align-items: flex-end;
          background: #252525;
          display: flex;
          height: 125px;
          padding-top: 24px;
      }

      .HeaderSolde-module--soldebox--f9f9f{
           color: #fff; 
      }

      .fieldService-module--fieldContainer--5858a {
           color: #fff; 
      }

      .fieldService-module--box--85ccc {
           color: #fff; 
      }

      .fieldService-module--box--85ccc {
          align-items: center;
          border: 0px solid var(--Contours, #dfe0eb);
          border-radius: 32px;
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          justify-content: space-around;
          margin-left: 5%;
          margin-right: 5%;
          margin-top: 16px;
      }

      .react-calendar {
          border: none;
          color: #fff;
          padding-bottom: 10px;
          text-decoration: none;
          width: 100%;
           background-color: #25252500;
      }

      .react-calendar__navigation__label__labelText {
           color: #fff; 
      }

      element.style {
          flex: 0 0 14.2857%;
          overflow: hidden;
          margin-inline-end: 0px;
      }

      abbr {
          text-decoration: none;
           background-color: #25252500;
      }

      .react-calendar button {
          margin: 7px;
          color: #fff;
      }

      .react-calendar__navigation button:enabled:focus, .react-calendar__navigation button:enabled:hover {
          background-color: #272727;
      }

      .HeaderNoImg-module--boxgris--13e65 {
           background-color: #25252500;
          border-bottom: 1px solid var(--contours, #dfe0eb);
      }

      .HeaderNoImg-module--TitleQrCode--aac67 {
           color: #fff; 
      }

      .Compte-module--separator--0ecdd {
          border: 1px solid #3e3e3e;
          margin-top: 16px;
      }
      .QrCode-module--btnRetour--a37fe {
          background: var(--bouton-dfaut, #1992a6);
          border: 0px solid var(--contours, #dfe0eb);
          border-radius: 100px;
          bottom: 80px;
          color: var(--bleu-dfaut, #fff);
          font-family: Inter;
          font-size: 12px;
          font-weight: 700;
          height: 36px;
          line-height: 12px;
          margin-left: 5%;
          margin-right: 5%;
          position: absolute;
          width: 90%;
      }

      .InputWhite-module--title--f032c {
           color: #fff; 
      }

      .EtabPrices-module--title--c8c56 {
           color: #fff; 
      }

      .EtabPrices-module--boxblue--a7021 {
          background: #f0f5ff00;
          border: 1px solid var(--contours, #dfe0eb);
          border-radius: 4px;
          margin-top: 24px;
      }

      .Recharge-module--SoldeBoxPayzen--b76ca {
           color: #fff; 
      }

      .Combo-module--combo--39a5b {
          -webkit-appearance: none;
          appearance: none;
          background-color: #171717;
          border: 1px solid #222;
          border-radius: 5px;
          color: #fff;
          font-family: Inter-SemiBold, sans-serif;
          font-size: 14px;
          height: 36px;
          margin: 10px 0 0;
          padding-left: 10px;
          width: 100%;
      }

      .Combo-module--title--652e4 {
           color: #fff;
      }

      .input-module--title--0de1c {
           color: #fff; 
      }

      .input-module--confirmBtn--0236a {
          background-color: #171717;
          border-radius: 5px;
          border-spacing: 0;
          border-width: 0;
          color: #fff;
          font-family: Inter-SemiBold, sans-serif;
          font-size: 14px;
          font-weight: 700;
          height: 36px;
          margin-top: 10px;
          padding-left: 10px;
      }

      .Footer-module--footer--8f5f6 {
          border-top: 2px solid #646464;
      }

      .ResaResume-module--title--b3014 {
        color: #fff;
      }

      .ResaResumeBox-module--libleft--936ca {
        color: #ffffff;
      }

      .ResaResumeBox-module--box--07ee0 p:nth-child(2) {
        color: #ffffff;
      }

      .ResaResumePopup-module--boxPopupFooter--35bff {
        background-color: #252525;
      }

      .ResaResumePopup-module--title--cbc4f {
        color: #fff;
      }

      .ResaResumePopup-module--subboxPopupFooter--83bdb button {
        background: #1992a6;
        color: #fff;
      }
    \`;
    document.head.appendChild(style);
  })();
`;

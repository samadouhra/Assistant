const TOASTER_WRAP_ID = "one-toaster-wrap";
// export type IToastType = "Error" | "Success";

function createToaster (toastType, message) {
  // creating toaster wrap if it doesn't exists
  if(!document.querySelector(`#${TOASTER_WRAP_ID}`)) {
    const wrapDiv = document.createElement("div");
    wrapDiv.setAttribute("id", TOASTER_WRAP_ID);
    document.body.appendChild(wrapDiv);

    // appending styling to website
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
    @keyframes fadeInOut {
      0% {opacity: 0;}
      10% {opacity: 1;}
      90% {opacity: 1;}
      100% {opacity: 0;}
    }

    #${TOASTER_WRAP_ID} {
      position: fixed;
      bottom: 10px;
      margin-left: calc(50% + 130px);
      transform: translate(-50%, 0px);
    }

    #${TOASTER_WRAP_ID} .toasterItem {
      color: #fff;
      padding: 5px 10px;
      border-radius: 2px;
      opacity: 0;
      animation: fadeInOut 3s;
    }

    #${TOASTER_WRAP_ID} .toasterItem p {
      margin: 0px;
    }

    #${TOASTER_WRAP_ID} .toasterItem.toast-success {
      background-color: #16a34a;
    }

    #${TOASTER_WRAP_ID} .toasterItem.toast-error {
      background-color: #be123c;
    }
    `;
    document.body.appendChild(styleEl);
  }

  const toasterEl = document.getElementById(TOASTER_WRAP_ID);

  // create toast message
  const toasterDiv = document.createElement("div")
  toasterDiv.setAttribute("class", `toasterItem ${toastType === "Error" ? "toast-error" : "toast-success"}`);
  toasterDiv.innerHTML = `<p>${message}</p>`;
  toasterEl.append(toasterDiv);

  setTimeout(() => {
    toasterEl.removeChild(toasterDiv);
  }, 3100)
}
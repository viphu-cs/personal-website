const enterBtn = document.getElementById("enter-btn");

const enterPage = document.getElementById("enter-page");

const siteContent = document.getElementById("site-content");

const bgm = document.getElementById("bgm");

/* CHECK URL PARAM */

const params = new URLSearchParams(window.location.search);

const skipEnter = params.get("skip");

/* SKIP ENTER */

if (skipEnter === "true") {

  enterPage.style.display = "none";

  siteContent.style.display = "block";

  /* REMOVE ?skip=true FROM URL */

  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  );

}

/* NORMAL MODE */

else {

  siteContent.style.display = "none";

}

/* ENTER BUTTON */

enterBtn.addEventListener("click", () => {

  bgm.play();

  enterPage.style.opacity = "1";

  enterPage.style.transition = "1s";

  setTimeout(() => {

    enterPage.style.display = "none";

    siteContent.style.display = "block";

  }, 1000);

});

const updates = [
  {
    date: "11/5/2026",
    content: "Start making a website."
  }

];

const container =
document.getElementById(
  "updates-container"
);

updates.forEach(update => {

  container.innerHTML += `

    <div class="update-post">

      <div class="update-date">
        [${update.date}]
      </div>

      <div class="update-content">
        ${update.content}
      </div>

    </div>

  `;

});
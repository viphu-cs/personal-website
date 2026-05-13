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

/* SPOTIFY IFRAME API */
window.onSpotifyIframeApiReady = (IFrameAPI) => {
  const element = document.getElementById('spotify-embed');
  const options = {
    uri: 'spotify:track:76j0uitplft5gODYnoQ62V',
    width: '100%',
    height: '100',
    theme: '0'
  };
  const callback = (EmbedController) => {
    let playTimeout;

    EmbedController.addListener('playback_update', e => {
      clearTimeout(playTimeout);

      // Check if the track has reached the end (less than 0.1 second remaining)
      const isEnded = e.data.duration > 0 && (e.data.duration - e.data.position) < 100;
      if (e.data.isPaused || isEnded) {
        // Paused or Ended: Revert to normal background
        document.body.style.backgroundImage = 'url("images/metro_bg.jpg")';
      } else {
        // Playing: Change to video/gif
        document.body.style.backgroundImage = 'url("images/canvas_yungtarr.gif")';

        // Fallback: If Spotify stops sending updates (e.g., preview ends without sending isPaused)
        // We revert the background after 3 seconds of no updates.
        playTimeout = setTimeout(() => {
          document.body.style.backgroundImage = 'url("images/metro_bg.jpg")';
        }, 3000);
      }
    });
  };
  IFrameAPI.createController(element, options, callback);
};
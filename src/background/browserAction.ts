import { sessions } from "./messenger";
import { updateURL, parseURL } from "./url";

chrome.browserAction.onClicked.addListener(tab => {
    const tabId = tab.id || 0;
    const tabUrl = tab.url || "";

    if (sessions.has(tabId)) {
        alert("This tab is already in a session.");
        return;
    }

    const { urlParams } = parseURL(tabUrl);
    const joinId = prompt("TBD: Host ID or blank:", urlParams.get("streamparty") || "");

    chrome.tabs.executeScript(tabId, {
        file: "js/session.js",
        allFrames: true
    });

    (function next(i): void {
        const host = sessions.get(tabId);

        if (host && host.isReady && host.id) {
            const hostId = host.id;

            chrome.browserAction.setBadgeText({
                text: "0",
                tabId: tab.id
            });

            host.subscribeToFriendChanges((count, delta) => {
                chrome.browserAction.setBadgeText({
                    text: `${count}`,
                    tabId: tab.id
                });

                chrome.notifications.create({
                    iconUrl: chrome.extension.getURL("logo.png"),
                    type: "basic",
                    title: "Stream Party",
                    message:
                        `${Math.abs(delta) === 1 ? "A" : Math.abs(delta)} friend has ${delta > 0 ? "joined" : "left"}. ` +
                        `You now have ${count} watching.`
                });
            });

            const shareURL = updateURL(tabUrl, urlParams => {
                urlParams.set("streamparty", hostId);
            });

            chrome.tabs.executeScript(tabId, {
                code: `history.replaceState(null, null, ${JSON.stringify(`${shareURL.href}`)});`
            });

            if (joinId) {
                host.connectToHost(joinId);
            } else {
                navigator.clipboard
                    .writeText(shareURL.href)
                    .then(() =>
                        alert("Video URL is copied to your clipboard. Share with friends and have them click the extension to join!")
                    )
                    .catch(err => alert(`Share the video URL below with friends:\n\n${shareURL.href}\n\n${err}`));
            }
        } else if (i < 10) {
            setTimeout(() => next(++i), 500);
        } else {
            alert("This tab does not have any compatible video");
        }
    })(0);
});

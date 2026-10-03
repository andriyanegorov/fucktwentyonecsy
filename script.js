"use strict";

const artists = [
	{ name: "HWorld", image: "hworld.png", hasPlaylist: true, telegram: "https://t.me/hworld_choppa", music: "https://music.yandex.ru/artist/19638076" },
	{ name: "Bwave$", image: "bwaves.png", hasPlaylist: false, telegram: "https://t.me/bwavs" },
	{ name: "Serafim", image: "mc_gk.png", hasPlaylist: false },
];
const designers = [
	{ name: "dvdFRITE", image: "dvdfrite.png", telegramChannel: "dvdfrite" },
];
const artistGroups = { artists, designers };

const artistName = document.getElementById("artist-name");
const artistNameBackground = document.querySelector(".artist-name-background");
const artistImage = document.getElementById("artist-image");
const artistPosition = document.querySelector(".artist-position");
const artistPlaylist = document.querySelector(".artist-playlist");
const artistDiscography = document.querySelector(".artist-discography");
const artistSocials = document.querySelector(".artist-socials");
const artistSocialLinks = {
	telegram: document.querySelector('[data-artist-link="telegram"]'),
	music: document.querySelector('[data-artist-link="music"]'),
};
const designerTelegram = document.querySelector(".designer-telegram");
const designerTelegramPosts = document.querySelector(".designer-telegram__posts");
const designerTelegramLink = document.querySelector(".designer-telegram__link");
const artistStage = document.querySelector(".artist-stage");
const artistDisplay = document.querySelector(".artist-display");
const artistContent = document.querySelector(".artist-content");
const artistControls = document.querySelector(".artist-controls");
const artistGroupButtons = document.querySelectorAll("[data-artist-group]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const animationDuration = prefersReducedMotion ? 600 : 1400;
const groupTransitionDuration = prefersReducedMotion ? 120 : 280;
const artistSlideDistance = prefersReducedMotion ? "35vw" : "100vw";
let activeArtistIndex = 0;
let activeArtistGroup = "artists";
let transitionInProgress = false;
let groupTransitionInProgress = false;
let telegramRefreshTimer = null;
let telegramRequestId = 0;

function renderDesignerTelegramPosts(items, channel) {
	const posts = items.filter((item) => {
		try {
			const postUrl = new URL(item.link);
			return postUrl.origin === "https://t.me" && postUrl.pathname.startsWith(`/${channel}/`);
		} catch {
			return false;
		}
	}).slice(0, 5);
	designerTelegramPosts.replaceChildren();

	if (!posts.length) {
		const emptyMessage = document.createElement("p");
		emptyMessage.className = "designer-telegram__message";
		emptyMessage.textContent = "Пока нет доступных публикаций.";
		designerTelegramPosts.append(emptyMessage);
		return;
	}

	for (const post of posts) {
		const postText = getTelegramPostText(post);
		const article = document.createElement("article");
		article.className = "designer-telegram__post";
		const thumbnail = typeof post.thumbnail === "string" && post.thumbnail.startsWith("https://tg.i-c-a.su/")
			? post.thumbnail
			: "";
		if (!postText && !thumbnail) {
			continue;
		}

		if (thumbnail) {
			const imageLink = document.createElement("a");
			imageLink.className = "designer-telegram__image-link";
			imageLink.href = post.link;
			imageLink.target = "_blank";
			imageLink.rel = "noopener noreferrer";
			imageLink.setAttribute("aria-label", "Открыть публикацию в Telegram");
			const image = document.createElement("img");
			image.className = "designer-telegram__image";
			image.src = thumbnail;
			image.alt = "";
			image.loading = "lazy";
			imageLink.append(image);
			article.append(imageLink);
		}

		const details = document.createElement("div");
		details.className = "designer-telegram__details";
		if (postText) {
			const link = document.createElement("a");
			link.className = "designer-telegram__post-link";
			link.href = post.link;
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			link.textContent = postText.length > 320 ? `${postText.slice(0, 320).trimEnd()}...` : postText;
			details.append(link);
		}

		const publishedAt = Date.parse(post.pubDate);
		if (!Number.isNaN(publishedAt)) {
			const date = document.createElement("time");
			date.className = "designer-telegram__date";
			date.dateTime = new Date(publishedAt).toISOString();
			date.textContent = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(publishedAt);
			details.append(date);
		}

		article.append(details);
		designerTelegramPosts.append(article);
	}
}

function getTelegramPostText(post) {
	const content = post.description || post.content || "";
	const parsedContent = new DOMParser().parseFromString(content, "text/html");
	parsedContent.querySelectorAll("img, script, style").forEach((element) => element.remove());
	parsedContent.querySelectorAll("br, p, div, blockquote, cite, a, b, strong").forEach((element) => {
		element.before(parsedContent.createTextNode(" "));
		element.after(parsedContent.createTextNode(" "));
	});

	const bodyText = parsedContent.body.textContent
		.replace(/https?:\/\/\S+/g, "")
		.replace(/^\[(?:photo|media)\]\s*/i, "")
		.replace(/\s+/g, " ")
		.trim();
	const title = (post.title || "").replace(/^\[(?:photo|media)\]\s*/i, "").trim();

	return bodyText || title;
}

async function updateDesignerTelegram(channel) {
	const requestId = ++telegramRequestId;
	const feedUrl = `https://tg.i-c-a.su/rss/${encodeURIComponent(channel)}`;
	const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
	designerTelegramPosts.setAttribute("aria-busy", "true");

	try {
		const response = await fetch(apiUrl, { cache: "no-store" });
		if (!response.ok) {
			throw new Error(`Telegram feed request failed: ${response.status}`);
		}

		const result = await response.json();
		if (result.status !== "ok" || !Array.isArray(result.items)) {
			throw new Error("Telegram feed returned an invalid response");
		}
		if (requestId === telegramRequestId) {
			renderDesignerTelegramPosts(result.items, channel);
		}
	} catch {
		if (requestId === telegramRequestId) {
			designerTelegramPosts.replaceChildren();
			const errorMessage = document.createElement("p");
			errorMessage.className = "designer-telegram__message";
			errorMessage.textContent = "Не удалось загрузить публикации. Откройте канал в Telegram.";
			designerTelegramPosts.append(errorMessage);
		}
	} finally {
		if (requestId === telegramRequestId) {
			designerTelegramPosts.removeAttribute("aria-busy");
		}
	}
}

function showArtist(index) {
	const currentGroup = artistGroups[activeArtistGroup];
	activeArtistIndex = (index + currentGroup.length) % currentGroup.length;
	const artist = currentGroup[activeArtistIndex];

	artistName.textContent = artist.name;
	artistNameBackground.textContent = artist.name;
	artistNameBackground.classList.toggle("is-long", artist.name.length > 8);
	artistNameBackground.classList.toggle("is-designer", activeArtistGroup === "designers");
	artistImage.src = artist.image;
	artistImage.alt = `${activeArtistGroup === "artists" ? "Артист" : "Дизайнер"} ${artist.name}`;
	artistPosition.textContent = `${String(activeArtistIndex + 1).padStart(2, "0")} / ${String(currentGroup.length).padStart(2, "0")}`;
	artistPlaylist.hidden = activeArtistGroup !== "artists" || !artist.hasPlaylist;
	artistDiscography.hidden = activeArtistGroup !== "artists" || artist.hasPlaylist;
	artistSocials.hidden = activeArtistGroup !== "artists" || (!artist.telegram && !artist.music);
	designerTelegram.hidden = activeArtistGroup !== "designers" || !artist.telegramChannel;
	artistControls.setAttribute("aria-label", `Переключение: ${activeArtistGroup === "artists" ? "артисты" : "дизайнеры"}`);

	if (artist.telegramChannel) {
		const channelUrl = `https://t.me/${artist.telegramChannel}`;
		designerTelegramLink.href = channelUrl;
		const channelChanged = designerTelegramPosts.dataset.channel !== artist.telegramChannel;
		if (channelChanged) {
			designerTelegramPosts.dataset.channel = artist.telegramChannel;
			designerTelegramPosts.replaceChildren();
			const loadingMessage = document.createElement("p");
			loadingMessage.className = "designer-telegram__message";
			loadingMessage.textContent = "Загрузка публикаций...";
			designerTelegramPosts.append(loadingMessage);
		}

		if (activeArtistGroup === "designers") {
			if (channelChanged || !telegramRefreshTimer) {
				updateDesignerTelegram(artist.telegramChannel);
			}
			if (!telegramRefreshTimer) {
				telegramRefreshTimer = window.setInterval(() => {
					if (activeArtistGroup === "designers") {
						updateDesignerTelegram(artist.telegramChannel);
					}
				}, 5 * 60 * 1000);
			}
		} else {
			telegramRequestId++;
			window.clearInterval(telegramRefreshTimer);
			telegramRefreshTimer = null;
		}
	} else {
		telegramRequestId++;
		window.clearInterval(telegramRefreshTimer);
		telegramRefreshTimer = null;
	}

	for (const [service, link] of Object.entries(artistSocialLinks)) {
		const url = artist[service];
		link.hidden = !url;

		if (url) {
			link.href = url;
			link.setAttribute("aria-label", `${artist.name} в ${service === "music" ? "Яндекс Музыке" : "Telegram"}`);
			link.title = `${artist.name} — ${service === "music" ? "Яндекс Музыка" : "Telegram"}`;
		} else {
			link.removeAttribute("href");
		}
	}
}

function transitionArtist(direction) {
	if (transitionInProgress) {
		return;
	}

	transitionInProgress = true;
	const outgoingDisplay = artistDisplay.cloneNode(true);
	const outgoingX = direction > 0 ? `-${artistSlideDistance}` : artistSlideDistance;
	const incomingX = direction > 0 ? artistSlideDistance : `-${artistSlideDistance}`;

	outgoingDisplay.setAttribute("aria-hidden", "true");
	outgoingDisplay.removeAttribute("id");
	outgoingDisplay.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
	outgoingDisplay.style.setProperty("--artist-exit-x", outgoingX);
	artistStage.appendChild(outgoingDisplay);

	artistDisplay.style.setProperty("--artist-entry-x", incomingX);
	artistDisplay.classList.add("is-entering");
	showArtist(activeArtistIndex + direction);
	void artistStage.offsetWidth;

	window.requestAnimationFrame(() => {
		outgoingDisplay.classList.add("is-exiting");
		artistDisplay.classList.remove("is-entering");
	});

	window.setTimeout(() => {
		outgoingDisplay.remove();
		transitionInProgress = false;
	}, animationDuration);
}

function showArtistGroup(groupName) {
	if (transitionInProgress || groupTransitionInProgress || !artistGroups[groupName] || activeArtistGroup === groupName) {
		return;
	}

	groupTransitionInProgress = true;
	artistContent.classList.add("is-switching");

	window.setTimeout(() => {
		activeArtistGroup = groupName;
		activeArtistIndex = 0;
		artistGroupButtons.forEach((button) => {
			button.setAttribute("aria-pressed", String(button.dataset.artistGroup === groupName));
		});
		showArtist(activeArtistIndex);

		window.requestAnimationFrame(() => {
			artistContent.classList.remove("is-switching");
			window.setTimeout(() => {
				groupTransitionInProgress = false;
			}, groupTransitionDuration);
		});
	}, groupTransitionDuration);
}

artistGroupButtons.forEach((button) => {
	button.addEventListener("click", () => showArtistGroup(button.dataset.artistGroup));
});

document.querySelector("[data-artist-previous]").addEventListener("click", () => {
	transitionArtist(-1);
});

document.querySelector("[data-artist-next]").addEventListener("click", () => {
	transitionArtist(1);
});

showArtist(activeArtistIndex);
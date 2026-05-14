const announcementText = document.getElementById('announcementText');

export function renderAnnouncementCard(message) {
  if (!announcementText) return;
  announcementText.textContent = message;
}

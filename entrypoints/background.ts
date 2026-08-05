export default defineBackground(() => {
  browser.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;
    await browser.tabs.sendMessage(tab.id, { type: 'TOGGLE_PICKER' });
  });
});

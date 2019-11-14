// RUN SCRIPT
const callback = () => {
  if (!window.main) {
    console.error('Bundle not injected');
    return;
  }
  safari.extension.dispatchMessage('Hlídač Shopů');
  main().catch(err => console.error(err));
  console.log('👋 Safari');
};

document.addEventListener('DOMContentLoaded', callback);
if (document.readyState !== 'loading') callback();

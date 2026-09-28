function wikiImage(name, image) {
  const asset = wikiImages[name];
  image.hidden = !asset;
  if (!asset) { image.removeAttribute('src'); return; }
  if (image.getAttribute('src') !== asset.path) image.src = asset.path;
  image.alt = name;
  image.onerror = () => { image.hidden = true; };
  let link = image.parentElement;
  if (link.tagName !== 'A') {
    link = document.createElement('a');
    image.replaceWith(link);
    link.append(image);
    link.target = '_blank';
    link.rel = 'noreferrer';
  }
  link.href = asset.source;
  link.setAttribute('aria-label', name + ' image on the official wiki');
}
function updateGraphics(recipe) {
  document.getElementById('itemName').textContent = recipe.item;
  document.getElementById('itemPreview').hidden = recipe.name === 'Custom recipe';
  wikiImage(recipe.item, document.getElementById('itemImage'));
  wikiImage(recipe.machine, document.getElementById('machineImage'));
  document.querySelectorAll('.input-row').forEach(row => {
    const name = row.querySelector('span').textContent;
    if (!wikiImages[name]) return;
    const icon = document.createElement('img');
    icon.width = 36;
    icon.height = 36;
    icon.loading = 'lazy';
    row.prepend(icon);
    wikiImage(name, icon);
  });
}

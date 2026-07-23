// PWA registration and install button logic for Cotizador Hugo Zárate
let deferredPrompt;

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registrado correctamente.', reg.scope))
      .catch(err => console.error('Fallo al registrar el Service Worker:', err));
  });
}

// Detect iOS devices
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Initialize PWA install UI on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('pwa-install-btn');
  const iosModal = document.getElementById('ios-install-modal');

  if (!installBtn) return;

  // For Android, Windows, macOS, Chrome OS, Linux (Browsers supporting beforeinstallprompt)
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI to show the install button
    installBtn.classList.remove('hidden');
    console.log('beforeinstallprompt disparado y guardado.');
  });

  // For iOS Safari (which doesn't support beforeinstallprompt but supports manual Add to Home Screen)
  if (isIOS() && !window.navigator.standalone) {
    // Show the install button specifically for iOS devices so they can see instructions
    installBtn.classList.remove('hidden');
  }

  // Handle click on install button
  installBtn.addEventListener('click', () => {
    if (isIOS()) {
      // Show iOS instruction modal
      if (iosModal) {
        iosModal.classList.remove('hidden');
      }
    } else if (deferredPrompt) {
      // Show the browser install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('El usuario aceptó la instalación de la App.');
          installBtn.classList.add('hidden');
        } else {
          console.log('El usuario canceló la instalación.');
        }
        deferredPrompt = null;
      });
    } else {
      // Fallback: If no prompt event, explain manual install
      alert('Para instalar esta aplicación, busca la opción "Instalar aplicación" o "Agregar a la pantalla principal" en el menú de opciones de tu navegador (los tres puntos de arriba a la derecha).');
    }
  });
});

// Close iOS Modal
function closeIosModal() {
  const iosModal = document.getElementById('ios-install-modal');
  if (iosModal) {
    iosModal.classList.add('hidden');
  }
}

// Close iOS Modal when clicking outside the content
window.addEventListener('click', (event) => {
  const iosModal = document.getElementById('ios-install-modal');
  if (iosModal && event.target === iosModal) {
    iosModal.classList.add('hidden');
  }
});

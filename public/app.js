// Cotizador Hugo Zárate Publicidad - Client Logic

let activeTab = 'new';
let quotesList = [];
let consecutivoNext = 1029;
let isEditMode = false;
let uploadedGalleryImages = [];

// Initialize QR library dynamically from CDN
const qrScript = document.createElement('script');
qrScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
document.head.appendChild(qrScript);

// Startup
document.addEventListener('DOMContentLoaded', () => {
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('quote-date').value = today;
  
  // Load initial data
  fetchConsecutivo();
  fetchQuotesHistory();
  
  // Add first row to table automatically
  addTableRow();

  // Prevent default drag and drop behaviors globally to avoid browser navigation
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    window.addEventListener(eventName, e => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  // Drag & drop logic for gallery-drop-area
  const dropArea = document.getElementById('gallery-drop-area');
  if (dropArea) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
    });

    dropArea.addEventListener('drop', e => {
      const dt = e.dataTransfer;
      const files = dt.files;
      uploadGalleryFiles(files);
    }, false);
  }
});

// Toggle Tabs
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  
  if (tab === 'new') {
    document.getElementById('tab-new').classList.add('active');
    document.getElementById('tab-new-btn').classList.add('active');
    fetchConsecutivo(); // Refresh consecutive number when switching to new quote tab
  } else {
    document.getElementById('tab-history').classList.add('active');
    document.getElementById('tab-history-btn').classList.add('active');
    fetchQuotesHistory(); // Reload history
  }
}

// Fetch Next Consecutive Number
function fetchConsecutivo() {
  fetch('/api/consecutivo?t=' + Date.now())
    .then(res => res.json())
    .then(data => {
      consecutivoNext = data.next;
      if (!isEditMode) {
        document.getElementById('current-consecutivo-display').innerText = consecutivoNext;
      }
    })
    .catch(err => console.error("Error fetching consecutivo:", err));
}

// Fetch Quotes History
function fetchQuotesHistory() {
  fetch('/api/quotes?t=' + Date.now())
    .then(res => res.json())
    .then(data => {
      quotesList = data;
      renderHistoryTable(quotesList);
    })
    .catch(err => console.error("Error fetching quotes:", err));
}

// Render History
function renderHistoryTable(quotes) {
  const tbody = document.getElementById('history-tbody');
  const emptyState = document.getElementById('history-empty-state');
  tbody.innerHTML = '';
  
  if (quotes.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }
  
  emptyState.style.display = 'none';
  
  quotes.forEach(quote => {
    const formattedTotal = formatCurrency(quote.total || 0);
    const formattedDate = formatDateString(quote.date);
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${quote.number}</strong></td>
      <td>${escapeHTML(quote.client)}</td>
      <td>${escapeHTML(quote.requestor)}</td>
      <td>${formattedDate}</td>
      <td>${escapeHTML(quote.agent)}</td>
      <td><strong>${formattedTotal}</strong></td>
      <td>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-action-sm" onclick="loadQuoteForEdit(${quote.number})">
            Editar
          </button>
          <button class="btn btn-success btn-action-sm" onclick="downloadQuotePDF(${quote.number})">
            PDF
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Filter/Search quotes in history
function filterQuotes() {
  const searchInput = document.getElementById('search-input').value.trim();
  if (searchInput === '') {
    renderHistoryTable(quotesList);
    return;
  }
  
  fetch(`/api/quotes?q=${encodeURIComponent(searchInput)}&t=${Date.now()}`)
    .then(res => res.json())
    .then(data => {
      renderHistoryTable(data);
    })
    .catch(err => console.error("Error filtering quotes:", err));
}

// Agent Change Dropdown
function handleAgentChange() {
  const select = document.getElementById('quote-agent');
  const customFields = document.getElementById('custom-agent-fields');
  
  if (select.value === 'Otro') {
    customFields.classList.remove('hidden');
  } else {
    customFields.classList.add('hidden');
  }
}

// Dynamic Table Rows
let rowCounter = 0;
function addTableRow(itemData = null) {
  const tbody = document.getElementById('items-tbody');
  const rowId = `row-${rowCounter++}`;
  
  const tr = document.createElement('tr');
  tr.id = rowId;
  
  const descVal = itemData ? itemData.description : '';
  const qtyVal = itemData ? itemData.quantity : 1;
  const priceVal = itemData ? itemData.unitPrice : 0;
  const totalVal = qtyVal * priceVal;
  const imgUrl = itemData ? itemData.imageUrl : '';
  
  // Custom image sizes if present
  const imgWidth = (itemData && itemData.imageWidth) ? `${itemData.imageWidth}px` : '80px';
  const imgHeight = (itemData && itemData.imageHeight) ? `${itemData.imageHeight}px` : '80px';
  
  tr.innerHTML = `
    <td>
      <div class="item-img-cell">
        <textarea class="item-desc" rows="2" placeholder="Ej. AVISO BASTIDOR, tamaño 330 x 90 cms..." required oninput="calculateTotals()">${escapeHTML(descVal)}</textarea>
        
        <!-- Upload item image -->
        <div class="item-image-wrapper">
          <input type="file" id="file-${rowId}" class="hidden" accept="image/*" onchange="uploadItemImage('${rowId}', event)">
          <button type="button" class="btn-upload-item-img" id="btn-upload-${rowId}" onclick="document.getElementById('file-${rowId}').click()">
            📷 Agregar Foto
          </button>
          <div class="item-thumb-container ${imgUrl ? '' : 'hidden'}" id="thumb-container-${rowId}" style="width: ${imgWidth}; height: ${imgHeight};">
            <img src="${imgUrl}" id="img-preview-${rowId}" alt="Muestra" style="width: 100%; height: 100%; object-fit: contain; background-color: #f8fafc; pointer-events: none;">
            <button type="button" class="remove-thumb-btn" onclick="removeItemImage('${rowId}')">×</button>
          </div>
          <input type="hidden" class="item-img-url" id="url-${rowId}" value="${imgUrl}">
        </div>
      </div>
    </td>
    <td>
      <input type="number" class="item-qty" min="1" step="any" value="${qtyVal}" required oninput="updateRowTotal('${rowId}')">
    </td>
    <td>
      <input type="number" class="item-price" min="0" step="any" value="${priceVal}" required oninput="updateRowTotal('${rowId}')">
    </td>
    <td>
      <strong class="item-row-total" id="total-${rowId}">${formatCurrency(totalVal)}</strong>
    </td>
    <td>
      <button type="button" class="btn btn-danger btn-action-sm" onclick="removeTableRow('${rowId}')">
        Eliminar
      </button>
    </td>
  `;
  
  tbody.appendChild(tr);
  
  // Drag & drop logic for this specific item row (bound to the entire description/image cell)
  const imgCell = tr.querySelector('.item-img-cell');
  if (imgCell) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      imgCell.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      imgCell.addEventListener(eventName, () => imgCell.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      imgCell.addEventListener(eventName, () => imgCell.classList.remove('dragover'), false);
    });

    imgCell.addEventListener('drop', e => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          const uploadBtn = document.getElementById(`btn-upload-${rowId}`);
          uploadBtn.innerText = '⏳ Cargando...';
          uploadBtn.disabled = true;
          
          optimizeAndUploadImage(file, (err, url) => {
            uploadBtn.innerText = '📷 Agregar Foto';
            uploadBtn.disabled = false;
            
            if (err) {
              alert("Error al subir la imagen.");
              return;
            }
            
            document.getElementById(`url-${rowId}`).value = url;
            document.getElementById(`img-preview-${rowId}`).src = url;
            const thumbContainer = document.getElementById(`thumb-container-${rowId}`);
            thumbContainer.classList.remove('hidden');
            
            // Adjust thumbnail container height proportionally based on the image size to prevent deformation
            const img = new Image();
            img.src = url;
            img.onload = function() {
              if (img.naturalWidth > 0) {
                const ratio = img.naturalHeight / img.naturalWidth;
                const height = Math.round(80 * ratio);
                thumbContainer.style.width = '80px';
                thumbContainer.style.height = `${height}px`;
              }
            };
          });
        }
      }
    }, false);
  }
  
  calculateTotals();
}

function removeTableRow(rowId) {
  const tbody = document.getElementById('items-tbody');
  const tr = document.getElementById(rowId);
  if (tbody.children.length > 1) {
    tr.remove();
    calculateTotals();
  } else {
    alert("La cotización debe tener al menos un artículo.");
  }
}

function updateRowTotal(rowId) {
  const tr = document.getElementById(rowId);
  const qty = parseFloat(tr.querySelector('.item-qty').value) || 0;
  const price = parseFloat(tr.querySelector('.item-price').value) || 0;
  const total = qty * price;
  
  tr.querySelector('.item-row-total').innerText = formatCurrency(total);
  calculateTotals();
}

// Calculations: Subtotal, IVA 19%, Total
function calculateTotals() {
  let subtotal = 0;
  const rows = document.querySelectorAll('#items-tbody tr');
  
  rows.forEach(tr => {
    const qty = parseFloat(tr.querySelector('.item-qty').value) || 0;
    const price = parseFloat(tr.querySelector('.item-price').value) || 0;
    subtotal += qty * price;
  });
  
  const iva = subtotal * 0.19;
  const total = subtotal + iva;
  
  document.getElementById('subtotal-val').innerText = formatCurrency(subtotal);
  document.getElementById('iva-val').innerText = formatCurrency(iva);
  document.getElementById('total-val').innerText = formatCurrency(total);
}

// Image Resizing (Canvas) & Upload
function uploadItemImage(rowId, event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const uploadBtn = document.getElementById(`btn-upload-${rowId}`);
  uploadBtn.innerText = '⏳ Cargando...';
  uploadBtn.disabled = true;
  
  optimizeAndUploadImage(file, (err, url) => {
    uploadBtn.innerText = '📷 Agregar Foto';
    uploadBtn.disabled = false;
    
    if (err) {
      alert("Error al subir la imagen.");
      return;
    }
    
    // Set hidden input and show thumbnail
    document.getElementById(`url-${rowId}`).value = url;
    document.getElementById(`img-preview-${rowId}`).src = url;
    const thumbContainer = document.getElementById(`thumb-container-${rowId}`);
    thumbContainer.classList.remove('hidden');
    
    // Adjust thumbnail container height proportionally based on the image size to prevent deformation
    const img = new Image();
    img.src = url;
    img.onload = function() {
      if (img.naturalWidth > 0) {
        const ratio = img.naturalHeight / img.naturalWidth;
        const height = Math.round(80 * ratio);
        thumbContainer.style.width = '80px';
        thumbContainer.style.height = `${height}px`;
      }
    };
  });
}

function removeItemImage(rowId) {
  document.getElementById(`url-${rowId}`).value = '';
  document.getElementById(`thumb-container-${rowId}`).classList.add('hidden');
}

// Optimize Image using Canvas
function optimizeAndUploadImage(file, callback) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = function (e) {
    const img = new Image();
    img.src = e.target.result;
    img.onload = function () {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_SIZE = 800; // Max dimension
      
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert canvas directly to Base64 JPEG URL (85% quality)
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        callback(null, dataUrl);
      } catch (err) {
        console.error("Error converting image to Base64:", err);
        callback(err);
      }
    };
  };
}

// Gallery Uploads (Anexos)
function triggerGalleryInput() {
  document.getElementById('gallery-file-input').click();
}

function handleGalleryUpload(event) {
  uploadGalleryFiles(event.target.files);
}

function uploadGalleryFiles(files) {
  if (!files || files.length === 0) return;
  
  const dropArea = document.getElementById('gallery-drop-area');
  const originalText = dropArea.querySelector('p').innerHTML;
  dropArea.querySelector('p').innerHTML = '⏳ Subiendo y optimizando muestras...';
  
  let uploadsRemaining = files.length;
  
  Array.from(files).forEach(file => {
    optimizeAndUploadImage(file, (err, url) => {
      uploadsRemaining--;
      
      if (!err && url) {
        uploadedGalleryImages.push({
          url: url,
          width: 110,
          height: 110
        });
        renderGalleryThumbnails();
      }
      
      if (uploadsRemaining === 0) {
        dropArea.querySelector('p').innerHTML = originalText;
        document.getElementById('gallery-file-input').value = ''; // Reset input
      }
    });
  });
}

function renderGalleryThumbnails() {
  const container = document.getElementById('gallery-preview-container');
  container.innerHTML = '';
  
  uploadedGalleryImages.forEach((item, idx) => {
    const url = typeof item === 'string' ? item : item.url;
    const width = (item && item.width) ? `${item.width}px` : '110px';
    const height = (item && item.height) ? `${item.height}px` : '110px';
    
    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.style.width = width;
    div.style.height = height;
    div.innerHTML = `
      <img src="${url}" alt="Muestra general" style="width: 100%; height: 100%; object-fit: contain; background-color: #f8fafc; pointer-events: none;">
      <button type="button" class="remove-btn" onclick="removeGalleryItem(${idx})">×</button>
    `;
    container.appendChild(div);
  });
}

function removeGalleryItem(index) {
  uploadedGalleryImages.splice(index, 1);
  renderGalleryThumbnails();
}

// Save / Submit Quote Form
function handleFormSubmit(event) {
  event.preventDefault();
  
  const client = document.getElementById('client-name').value.trim();
  const requestor = document.getElementById('requestor-name').value.trim();
  const date = document.getElementById('quote-date').value;
  const paymentTerms = document.getElementById('payment-terms').value.trim();
  const deliveryTime = document.getElementById('delivery-time').value.trim();
  const deliveryPlace = document.getElementById('delivery-place').value.trim();
  const observations = document.getElementById('observations').value.trim();
  
  // Agent Details
  const agentSelect = document.getElementById('quote-agent');
  let agentName = '';
  let agentRole = '';
  let agentPhone = '';
  
  if (agentSelect.value === 'Otro') {
    agentName = document.getElementById('custom-agent-name').value.trim() || 'Hugo Zárate Publicidad';
    agentRole = document.getElementById('custom-agent-role').value.trim() || '';
    agentPhone = document.getElementById('custom-agent-phone').value.trim() || '';
  } else {
    agentName = agentSelect.value;
    const selectedOption = agentSelect.options[agentSelect.selectedIndex];
    agentRole = selectedOption.getAttribute('data-role');
    agentPhone = selectedOption.getAttribute('data-phone');
  }
  
  // Collect Items
  const items = [];
  const rows = document.querySelectorAll('#items-tbody tr');
  let validItems = true;
  
  rows.forEach(tr => {
    const description = tr.querySelector('.item-desc').value.trim();
    const quantity = parseFloat(tr.querySelector('.item-qty').value) || 0;
    const unitPrice = parseFloat(tr.querySelector('.item-price').value) || 0;
    const imageUrl = tr.querySelector('.item-img-url').value;
    
    // Capture custom dimensions if resized
    const thumbContainer = tr.querySelector('.item-thumb-container');
    const imageWidth = thumbContainer.style.width ? parseFloat(thumbContainer.style.width) : null;
    const imageHeight = thumbContainer.style.height ? parseFloat(thumbContainer.style.height) : null;
    
    if (!description || quantity <= 0) {
      validItems = false;
      return;
    }
    
    items.push({
      description,
      quantity,
      unitPrice,
      imageUrl,
      imageWidth,
      imageHeight
    });
  });
  
  if (!validItems || items.length === 0) {
    alert("Por favor rellene las descripciones y cantidades de todos los artículos.");
    return;
  }
  
  // Totals
  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const iva = subtotal * 0.19;
  const total = subtotal + iva;
  
  // Collect Gallery items with custom dimensions
  const galleryItems = [];
  const galleryElements = document.querySelectorAll('#gallery-preview-container .gallery-item');
  galleryElements.forEach((el) => {
    const img = el.querySelector('img');
    const url = img.getAttribute('src');
    const width = el.style.width ? parseFloat(el.style.width) : null;
    const height = el.style.height ? parseFloat(el.style.height) : null;
    galleryItems.push({ url, width, height });
  });
  
  const quoteData = {
    client,
    requestor,
    date,
    paymentTerms,
    deliveryTime,
    deliveryPlace,
    observations,
    agent: agentName,
    agentRole,
    agentPhone,
    items,
    subtotal,
    iva,
    total,
    gallery: galleryItems
  };
  
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  saveBtn.innerText = '⏳ Guardando...';
  
  const editId = document.getElementById('edit-quote-id').value;
  const isEditing = editId !== '';
  const url = isEditing ? `/api/quotes/${editId}` : '/api/quotes';
  const method = isEditing ? 'PUT' : 'POST';
  
  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(quoteData)
  })
  .then(res => res.json())
  .then(data => {
    saveBtn.disabled = false;
    saveBtn.innerHTML = `
      <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
      Guardar Cotización
    `;
    
    if (data.success) {
      alert(isEditing ? 'Cotización actualizada con éxito!' : `Cotización #${data.quote.number} guardada con éxito!`);
      
      // Auto-trigger PDF download for convenience
      generatePDF(data.quote);
      
      if (!isEditing) {
        // Clear form and cancel edit mode only if it's a new quote
        clearForm();
        fetchConsecutivo();
        switchTab('history');
      } else {
        // If editing, reload history in the background so it reflects the changes,
        // but DO NOT clear the form so the user can continue editing if desired
        fetchQuotesHistory();
      }
    } else {
      alert("Error al guardar la cotización: " + data.error);
    }
  })
  .catch(err => {
    saveBtn.disabled = false;
    saveBtn.innerHTML = `Guardar Cotización`;
    console.error("Error saving quote:", err);
    alert("Error de red al guardar la cotización.");
  });
}

// Clear Form
function clearForm() {
  document.getElementById('edit-quote-id').value = '';
  document.getElementById('client-name').value = '';
  document.getElementById('requestor-name').value = '';
  document.getElementById('quote-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('payment-terms').value = '30 DIAS';
  document.getElementById('delivery-time').value = '3 DIAS';
  document.getElementById('delivery-place').value = 'Bogotá';
  document.getElementById('observations').value = '';
  
  // Reset agent selection
  document.getElementById('quote-agent').value = 'Marilyn Salinas';
  handleAgentChange();
  
  // Clear items table
  document.getElementById('items-tbody').innerHTML = '';
  rowCounter = 0;
  addTableRow();
  
  // Clear visual samples
  uploadedGalleryImages = [];
  renderGalleryThumbnails();
  
  // Cancel edit mode UI
  cancelEditMode();
}

// Cancel edit UI
function cancelEditMode() {
  isEditMode = false;
  document.getElementById('edit-quote-id').value = '';
  document.getElementById('form-title').innerText = 'Generar Nueva Cotización';
  document.getElementById('cancel-edit-btn').classList.add('hidden');
  document.getElementById('current-consecutivo-display').innerText = consecutivoNext;
}

// Load Quote For Edit
function loadQuoteForEdit(number) {
  const quote = quotesList.find(q => q.number === number);
  if (!quote) return;
  
  isEditMode = true;
  document.getElementById('edit-quote-id').value = quote.id;
  document.getElementById('form-title').innerText = `Editar Cotización #${quote.number}`;
  document.getElementById('current-consecutivo-display').innerText = quote.number;
  document.getElementById('cancel-edit-btn').classList.remove('hidden');
  
  // Set meta values
  document.getElementById('client-name').value = quote.client;
  document.getElementById('requestor-name').value = quote.requestor;
  document.getElementById('quote-date').value = quote.date;
  document.getElementById('payment-terms').value = quote.paymentTerms || '';
  document.getElementById('delivery-time').value = quote.deliveryTime || '';
  document.getElementById('delivery-place').value = quote.deliveryPlace || '';
  document.getElementById('observations').value = quote.observations || '';
  
  // Set Agent
  const agentSelect = document.getElementById('quote-agent');
  let optionExists = false;
  
  for (let i = 0; i < agentSelect.options.length; i++) {
    if (agentSelect.options[i].value === quote.agent) {
      agentSelect.value = quote.agent;
      optionExists = true;
      break;
    }
  }
  
  if (!optionExists) {
    agentSelect.value = 'Otro';
    handleAgentChange();
    document.getElementById('custom-agent-name').value = quote.agent;
    document.getElementById('custom-agent-role').value = quote.agentRole || '';
    document.getElementById('custom-agent-phone').value = quote.agentPhone || '';
  } else {
    handleAgentChange();
  }
  
  // Populate Items Table
  const tbody = document.getElementById('items-tbody');
  tbody.innerHTML = '';
  rowCounter = 0;
  
  if (quote.items && quote.items.length > 0) {
    quote.items.forEach(item => {
      addTableRow(item);
    });
  } else {
    addTableRow();
  }
  
  // Populate Gallery
  uploadedGalleryImages = quote.gallery || [];
  renderGalleryThumbnails();
  
  // Switch to creation tab
  switchTab('new');
}

// Direct download from history
function downloadQuotePDF(number) {
  const quote = quotesList.find(q => q.number === number);
  if (!quote) return;
  generatePDF(quote);
}

// Export current quote from form
function exportCurrentQuoteToPDF() {
  const client = document.getElementById('client-name').value.trim();
  const requestor = document.getElementById('requestor-name').value.trim();
  if (!client || !requestor) {
    alert("Por favor complete al menos el Nombre del Cliente y Solicitante para exportar el PDF.");
    return;
  }
  
  // Collect all items
  const items = [];
  const rows = document.querySelectorAll('#items-tbody tr');
  rows.forEach(tr => {
    const description = tr.querySelector('.item-desc').value.trim();
    const quantity = parseFloat(tr.querySelector('.item-qty').value) || 0;
    const unitPrice = parseFloat(tr.querySelector('.item-price').value) || 0;
    const imageUrl = tr.querySelector('.item-img-url').value;
    
    // Capture custom dimensions if resized
    const thumbContainer = tr.querySelector('.item-thumb-container');
    const imageWidth = thumbContainer.style.width ? parseFloat(thumbContainer.style.width) : null;
    const imageHeight = thumbContainer.style.height ? parseFloat(thumbContainer.style.height) : null;
    
    if (description && quantity > 0) {
      items.push({ 
        description, 
        quantity, 
        unitPrice, 
        imageUrl,
        imageWidth,
        imageHeight
      });
    }
  });
  
  // Agent Details
  const agentSelect = document.getElementById('quote-agent');
  let agentName = '';
  let agentRole = '';
  let agentPhone = '';
  
  if (agentSelect.value === 'Otro') {
    agentName = document.getElementById('custom-agent-name').value.trim() || 'Hugo Zárate Publicidad';
    agentRole = document.getElementById('custom-agent-role').value.trim() || '';
    agentPhone = document.getElementById('custom-agent-phone').value.trim() || '';
  } else {
    agentName = agentSelect.value;
    const selectedOption = agentSelect.options[agentSelect.selectedIndex];
    agentRole = selectedOption.getAttribute('data-role');
    agentPhone = selectedOption.getAttribute('data-phone');
  }
  
  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const iva = subtotal * 0.19;
  const total = subtotal + iva;
  
  const number = document.getElementById('edit-quote-id').value !== '' ? 
    document.getElementById('current-consecutivo-display').innerText : consecutivoNext;
  
  // Collect Gallery items with custom dimensions
  const galleryItems = [];
  const galleryElements = document.querySelectorAll('#gallery-preview-container .gallery-item');
  galleryElements.forEach((el) => {
    const img = el.querySelector('img');
    const url = img.getAttribute('src');
    const width = el.style.width ? parseFloat(el.style.width) : null;
    const height = el.style.height ? parseFloat(el.style.height) : null;
    galleryItems.push({ url, width, height });
  });
  
  const temporaryQuote = {
    number: number,
    client: client,
    requestor: requestor,
    date: document.getElementById('quote-date').value,
    paymentTerms: document.getElementById('payment-terms').value.trim(),
    deliveryTime: document.getElementById('delivery-time').value.trim(),
    deliveryPlace: document.getElementById('delivery-place').value.trim(),
    observations: document.getElementById('observations').value.trim(),
    agent: agentName,
    agentRole: agentRole,
    agentPhone: agentPhone,
    items: items,
    subtotal: subtotal,
    iva: iva,
    total: total,
    gallery: galleryItems
  };
  
  generatePDF(temporaryQuote);
}

// ============================================================
// PDF ENGINE - Explicit per-page rendering (jsPDF + html2canvas)
// ============================================================

/** Promise that resolves once all img tags in element are fully loaded */
function waitForImagesAsync(element) {
  return new Promise(resolve => {
    const imgs = element.querySelectorAll('img');
    if (!imgs.length) { resolve(); return; }
    let done = 0;
    imgs.forEach(img => {
      if (img.complete && img.naturalWidth !== 0) {
        if (++done === imgs.length) resolve();
      } else {
        const finish = () => { if (++done === imgs.length) resolve(); };
        img.onload  = finish;
        img.onerror = finish;
      }
    });
  });
}

/** Simple sleep/delay helper */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Draws a crisp vector footer bar at the bottom of the PDF page in jsPDF */
function drawPDFSystemFooter(pdf) {
  // Orange color #f97316
  pdf.setFillColor(249, 115, 22);
  // Draw rectangle: 8.5in wide, 0.35in tall, at the very bottom (y = 11 - 0.35)
  pdf.rect(0, 11 - 0.35, 8.5, 0.35, 'F');

  // White centered text
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(255, 255, 255);
  const footerText = "Cra. 28 No. 10 - 70 Local 401 Barrio Ricaurte - Bogotá - Colombia   |   Cel. 314 330 09 13   |   Email: hugozaratepublicidad@hotmail.com";
  const textWidth = pdf.getTextWidth(footerText);
  const x = (8.5 - textWidth) / 2;
  const y = 11 - 0.175 + 0.035; // Vertically center the text
  pdf.text(footerText, x, y);
}

/** Build a single <tr> element for a quote item row (reused for measurement + rendering) */
function buildPDFItemRow(item) {
  const rowTotal = item.quantity * item.unitPrice;
  const tr = document.createElement('tr');
  let descHTML = '';
  if (item.imageUrl) {
    // Only set custom width in inline styles, letting height be calculated automatically as 'auto'
    // to preserve the natural aspect ratio of the image. This prevents html2canvas from deforming it.
    const sty = item.imageWidth
      ? `style="width:${item.imageWidth}px;height:auto;aspect-ratio:auto;"`
      : 'style="width:90px;height:auto;aspect-ratio:auto;"';
    descHTML = `<div class="pdf-item-desc-container">
      <img src="${item.imageUrl}" class="pdf-item-img" ${sty} alt="Muestra">
      <div class="pdf-item-text">${escapeHTML(item.description)}</div>
    </div>`;
  } else {
    descHTML = `<div class="pdf-item-text">${escapeHTML(item.description)}</div>`;
  }
  tr.innerHTML = `
    <td class="text-left">${descHTML}</td>
    <td class="text-center bold-text">${item.quantity}</td>
    <td class="text-right">${formatCurrency(item.unitPrice)}</td>
    <td class="text-right bold-text">${formatCurrency(rowTotal)}</td>
  `;
  return tr;
}

/**
 * Main PDF generator.
 * Renders each page individually with html2canvas (816×1056 px capture)
 * and assembles them into a jsPDF document.
 *
 * Steps:
 *  1. Populate static fields in the template
 *  2. Measure how much vertical space is available for item rows on page 1
 *     (subtracting header banner, title, meta, intro, thead, tfoot, footer-layout, footer-bar)
 *  3. Measure each item's actual rendered height in a hidden div
 *  4. Split items across pages so nothing is ever cut
 *  5. For each page: show correct items, hide/show sections, capture with html2canvas
 *  6. Gallery (if any) → its own fixed page
 *  7. Save final PDF
 */
async function generatePDF(quote) {
  const PAGE_W   = 816;
  const PAGE_H   = 1056;
  const container = document.getElementById('print-template').parentElement;
  const page1     = document.getElementById('pdf-page-1');
  const page2     = document.getElementById('pdf-page-2');

  // ── 1. Populate static template fields ──────────────────────────
  document.getElementById('pdf-number').innerText       = padQuoteNumber(quote.number);
  document.getElementById('pdf-client').innerText       = quote.client;
  document.getElementById('pdf-requestor').innerText    = quote.requestor;
  document.getElementById('pdf-date').innerText         = formatDateLong(quote.date);
  document.getElementById('pdf-subtotal').innerText     = formatCurrency(quote.subtotal);
  document.getElementById('pdf-iva').innerText          = formatCurrency(quote.iva);
  document.getElementById('pdf-total').innerText        = formatCurrency(quote.total);
  document.getElementById('pdf-observations').innerText   = quote.observations   || 'Ninguna';
  document.getElementById('pdf-payment-terms').innerText  = quote.paymentTerms   || '30 DIAS';
  document.getElementById('pdf-delivery-time').innerText  = quote.deliveryTime   || '3 DIAS';
  document.getElementById('pdf-delivery-place').innerText = quote.deliveryPlace  || 'En instalaciones';
  document.getElementById('pdf-agent-name').innerText   = quote.agent.toUpperCase();
  document.getElementById('pdf-agent-role').innerText   = quote.agentRole  || '';
  document.getElementById('pdf-agent-phone').innerText  = quote.agentPhone ? `Cel.: ${quote.agentPhone}` : '';

  const sigImg  = document.getElementById('pdf-signature-img');
  const agentLw = quote.agent.toLowerCase();
  if      (agentLw.includes('hugo'))    { sigImg.src = 'signature.png';         sigImg.style.display = 'block'; }
  else if (agentLw.includes('marilyn')) { sigImg.src = 'signature_marilyn.png'; sigImg.style.display = 'block'; }
  else                                  { sigImg.style.display = 'none'; }

  // ── 2. Show template, hide HTML footers & wait for static images ──
  container.style.display = 'block';
  page2.style.display     = 'none';

  // Hide HTML footer bars to prevent duplicate/blurry rendering (we draw them programmatically in jsPDF)
  const footerBars = document.querySelectorAll('.pdf-footer-bar');
  footerBars.forEach(bar => bar.style.visibility = 'hidden');

  await waitForImagesAsync(page1);
  await sleep(120);

  // ── 3. Get references to key DOM sections ────────────────────────
  const pdfTbody     = document.getElementById('pdf-items-tbody');
  const footerLayout = page1.querySelector('.pdf-footer-layout');
  const tableTfoot   = page1.querySelector('.pdf-items-table tfoot');
  const headerBanner = page1.querySelector('.pdf-header-banner');
  const titleRow     = page1.querySelector('.pdf-document-title-row');
  const metaTable    = page1.querySelector('.pdf-meta-table');
  const introText    = page1.querySelector('.pdf-intro-text');
  const thead        = page1.querySelector('.pdf-items-table thead');

  // ── 4. Put all items on a single page ────────────────────────────
  const contentPages = [quote.items.map((_, idx) => idx)];

  // ── 7. Init jsPDF ────────────────────────────────────────────────
  const { jsPDF } = window.jspdf;
  const pdf        = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });
  const clientSafe = quote.client.replace(/[^a-zA-Z0-9]/g, '_');
  const filename   = `Cotizacion_${padQuoteNumber(quote.number)}_${clientSafe}.pdf`;

  // ── 8. Render each content page ──────────────────────────────────
  for (let pIdx = 0; pIdx < contentPages.length; pIdx++) {
    const isFirst   = pIdx === 0;
    const isLast    = pIdx === contentPages.length - 1;
    const indices   = contentPages[pIdx];

    // Show full header elements only on first page
    headerBanner.style.display = isFirst ? '' : 'none';
    titleRow.style.display     = isFirst ? '' : 'none';
    metaTable.style.display    = isFirst ? '' : 'none';
    introText.style.display    = isFirst ? '' : 'none';

    // Totals (tfoot) and full footer section (obs + sig + banks) only on last page
    tableTfoot.style.display   = isLast ? '' : 'none';
    footerLayout.style.display = isLast ? '' : 'none';

    // Populate the items for this page
    pdfTbody.innerHTML = '';
    indices.forEach(i => pdfTbody.appendChild(buildPDFItemRow(quote.items[i])));

    await waitForImagesAsync(pdfTbody);
    await sleep(80);

    // ── 5. Auto-adjust layout to fit exactly on the single page ──────
    const imgElements = page1.querySelectorAll('.pdf-item-img');
    const tableCells = page1.querySelectorAll('.pdf-items-table td, .pdf-items-table th');
    const metaTableEl = page1.querySelector('.pdf-meta-table');
    const footerLayoutEl = page1.querySelector('.pdf-footer-layout');
    const titleRowEl = page1.querySelector('.pdf-document-title-row');
    const obsEl = page1.querySelector('.pdf-observations-content');
    const headerBannerEl = page1.querySelector('.pdf-header-banner');
    const introTextEl = page1.querySelector('.pdf-intro-text');
    const stampEl = page1.querySelector('.signature-stamp');
    const flexSpacer = page1.querySelector('.pdf-flex-spacer');

    // Disable flex spacer temporarily during measurement to get natural content height
    if (flexSpacer) flexSpacer.style.display = 'none';

    const getBottomY = () => footerLayoutEl.getBoundingClientRect().bottom;
    const getPageBottomLimit = () => page1.getBoundingClientRect().bottom - 42; // 35px bottom padding + 7px safe buffer

    let imageWidth = 90;
    let paddingY = 5;
    let paddingX = 10;
    let mainFontSize = 13;
    let itemFontSize = 13;
    let obsMinHeight = 40;
    let obsPadding = 10;
    let signatureHeight = 50;
    let bannerMarginBottom = 10;
    let titleMarginBottom = 8;
    let metaMarginBottom = 8;
    let introMarginBottom = 8;
    let footerLayoutMarginTop = 6;
    let footerLayoutMarginBottom = 6;

    let iterations = 0;
    const maxIterations = 20;

    while (getBottomY() > getPageBottomLimit() && iterations < maxIterations) {
      iterations++;
      
      if (iterations === 1) {
        imageWidth = 75;
        paddingY = 4;
        paddingX = 8;
        bannerMarginBottom = 4;
        titleMarginBottom = 4;
        metaMarginBottom = 4;
        introMarginBottom = 4;
      } else if (iterations === 2) {
        imageWidth = 60;
        paddingY = 3;
        paddingX = 6;
        mainFontSize = 12;
        itemFontSize = 11.5;
        obsMinHeight = 30;
        obsPadding = 6;
      } else if (iterations === 3) {
        imageWidth = 45;
        paddingY = 2;
        paddingX = 4;
        mainFontSize = 11.5;
        itemFontSize = 10.5;
        signatureHeight = 40;
        footerLayoutMarginTop = 2;
        footerLayoutMarginBottom = 2;
      } else if (iterations === 4) {
        imageWidth = 35;
        paddingY = 1.5;
        paddingX = 3;
        mainFontSize = 11;
        itemFontSize = 9.5;
        obsMinHeight = 20;
        obsPadding = 4;
        signatureHeight = 30;
      } else {
        // Progressive extreme shrinking for many items
        imageWidth = Math.max(20, imageWidth - 2);
        paddingY = Math.max(0.5, paddingY - 0.2);
        paddingX = Math.max(1, paddingX - 0.5);
        mainFontSize = Math.max(9.5, mainFontSize - 0.2);
        itemFontSize = Math.max(8.5, itemFontSize - 0.2);
        obsMinHeight = Math.max(10, obsMinHeight - 2);
        signatureHeight = Math.max(20, signatureHeight - 2);
      }

      // Apply styling updates to DOM
      imgElements.forEach(img => {
        img.style.width = `${imageWidth}px`;
        img.style.height = 'auto';
      });
      tableCells.forEach(cell => {
        cell.style.padding = `${paddingY}px ${paddingX}px`;
      });
      page1.style.fontSize = `${mainFontSize}px`;
      const itemTexts = page1.querySelectorAll('.pdf-item-text');
      itemTexts.forEach(txt => txt.style.fontSize = `${itemFontSize}px`);
      
      if (obsEl) {
        obsEl.style.minHeight = `${obsMinHeight}px`;
        obsEl.style.padding = `${obsPadding}px`;
      }
      if (titleRowEl) titleRowEl.style.marginBottom = `${titleMarginBottom}px`;
      if (metaTableEl) metaTableEl.style.marginBottom = `${metaMarginBottom}px`;
      if (headerBannerEl) headerBannerEl.style.marginBottom = `${bannerMarginBottom}px`;
      if (introTextEl) introTextEl.style.marginBottom = `${introMarginBottom}px`;
      if (footerLayoutEl) {
        footerLayoutEl.style.marginTop = `${footerLayoutMarginTop}px`;
        footerLayoutEl.style.marginBottom = `${footerLayoutMarginBottom}px`;
      }
      if (stampEl) stampEl.style.height = `${signatureHeight}px`;

      await sleep(25); // Let DOM reflow/update layout
    }

    // Restore spacer before capturing to push the footer layout down to the bottom
    if (flexSpacer) flexSpacer.style.display = '';
    await sleep(25); // Let DOM reflow/update layout with spacer restored

    // Capture exactly PAGE_W × PAGE_H pixels
    const canvas = await html2canvas(page1, {
      scale: 2, useCORS: true, logging: false,
      scrollX: 0, scrollY: 0,
      windowWidth: PAGE_W, width: PAGE_W, height: PAGE_H
    });

    if (pIdx > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, 8.5, 11);
    drawPDFSystemFooter(pdf); // Draw vector footer bar on content page

    // Restore dynamically adjusted styles to keep a clean template
    imgElements.forEach(img => {
      img.style.width = '';
      img.style.height = '';
    });
    tableCells.forEach(cell => cell.style.padding = '');
    if (obsEl) {
      obsEl.style.minHeight = '';
      obsEl.style.padding = '';
    }
    if (titleRowEl) titleRowEl.style.marginBottom = '';
    if (metaTableEl) metaTableEl.style.marginBottom = '';
    if (headerBannerEl) headerBannerEl.style.marginBottom = '';
    if (introTextEl) introTextEl.style.marginBottom = '';
    if (footerLayoutEl) {
      footerLayoutEl.style.marginTop = '';
      footerLayoutEl.style.marginBottom = '';
    }
    if (stampEl) stampEl.style.height = '';
    page1.style.fontSize = '';
    const itemTexts = page1.querySelectorAll('.pdf-item-text');
    itemTexts.forEach(txt => txt.style.fontSize = '');
  }

  // ── 9. Restore page 1 template to clean state ────────────────────
  headerBanner.style.display = '';
  titleRow.style.display     = '';
  metaTable.style.display    = '';
  introText.style.display    = '';
  tableTfoot.style.display   = '';
  footerLayout.style.display = '';
  pdfTbody.innerHTML         = '';

  // ── 10. Gallery page pagination & rendering ──────────────────────
  if (quote.gallery && quote.gallery.length > 0) {
    const galleryGrid = document.getElementById('pdf-gallery-grid');
    page2.style.display = 'block';

    const galleryPages = [];
    let currentPg = [];

    // Helper to build a gallery image element preserving aspect ratio
    function createGalleryDOMElement(item) {
      const url  = typeof item === 'string' ? item : item.url;
      const cW   = (item && item.width)  ? `width:${item.width}px;`   : 'width:170px;';
      const cont = document.createElement('div');
      cont.className = 'pdf-gallery-img-container';
      cont.style.cssText = `${cW}height:auto;aspect-ratio:auto;`;
      cont.innerHTML = `<img src="${url}" alt="Muestra" style="width:100%;height:auto;display:block;border-radius:4px;">`;
      return cont;
    }

    // Paginate gallery items dynamically based on rendered height
    for (const item of quote.gallery) {
      const el = createGalleryDOMElement(item);
      galleryGrid.appendChild(el);
      
      const gridHeight = galleryGrid.getBoundingClientRect().height;
      
      // 700px is the maximum height of the gallery grid before it overflows the page
      if (gridHeight > 700 && currentPg.length > 0) {
        galleryPages.push([...currentPg]);
        galleryGrid.innerHTML = '';
        galleryGrid.appendChild(el);
        currentPg = [item];
      } else {
        currentPg.push(item);
      }
    }
    if (currentPg.length > 0) {
      galleryPages.push(currentPg);
    }

    // Render each gallery page and capture it
    for (let gIdx = 0; gIdx < galleryPages.length; gIdx++) {
      galleryGrid.innerHTML = '';
      galleryPages[gIdx].forEach(item => {
        galleryGrid.appendChild(createGalleryDOMElement(item));
      });

      await waitForImagesAsync(page2);
      await sleep(80);

      const c2 = await html2canvas(page2, {
        scale: 2, useCORS: true, logging: false,
        scrollX: 0, scrollY: 0,
        windowWidth: PAGE_W, width: PAGE_W, height: PAGE_H
      });
      
      pdf.addPage();
      pdf.addImage(c2.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, 8.5, 11);
      drawPDFSystemFooter(pdf); // Draw vector footer bar on gallery page
    }

    page2.style.display = 'none';
    galleryGrid.innerHTML = '';
  }

  // ── 11. Save and clean up ────────────────────────────────────────
  footerBars.forEach(bar => bar.style.visibility = ''); // Restore HTML footers
  pdf.save(filename);
  container.style.display = 'none';
}



/* Helper formatting functions */
function formatCurrency(val) {
  return '$ ' + parseFloat(val).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function padQuoteNumber(num) {
  const n = parseInt(num);
  if (isNaN(n)) return num;
  return n.toString().padStart(3, '0');
}

function formatDateString(isoString) {
  if (!isoString) return '';
  const parts = isoString.split('-');
  if (parts.length !== 3) return isoString;
  return `${parts[1]}-${parts[2]}-${parts[0]}`; // MM-DD-YYYY
}

function formatDateLong(isoString) {
  if (!isoString) return '';
  const dateObj = new Date(isoString + 'T12:00:00'); // avoid timezone offset issues
  const months = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ];
  const day = dateObj.getDate();
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day.toString().padStart(2, '0')} de ${month} ${year}`;
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

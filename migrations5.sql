-- OX WhatShop: template de mensaje por defecto con emojis reales
update settings
set data = jsonb_set(data, '{store,messageTemplate}',
  '"🛒 NUEVO PEDIDO - {storeName}\n\n👤 Cliente: {name}\n📱 Teléfono: {phone}\n💳 Método de pago: {paymentMethod}\n{noteText}\n\n{items}\n\nTOTAL: {total}"'::jsonb)
where store_id = 1;
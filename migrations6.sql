-- OX WhatShop: template por defecto con emojis (surrogate pairs ASCII seguros)
update settings
set data = jsonb_set(data, '{store,messageTemplate}',
  '"\uD83D\uDED2 NUEVO PEDIDO - {storeName}\n\n\uD83D\uDC64 Cliente: {name}\n\uD83D\uDCF1 Telefono: {phone}\n\uD83D\uDCB3 Metodo de pago: {paymentMethod}\n{noteText}\n\n{items}\n\nTOTAL: {total}"'::jsonb)
where store_id = 1;
// Genera demo.sql con 12 categorias y 50 productos (con variantes color x talla)
const TEMPLATES = {
  zapatos: [1, [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48]],
  anillos: [2, ["10","11","12","13","14","15","16","17","18","19","20","21","22"]],
  cadenas: [3, ["20mm","30mm","40mm","50mm","60mm"]],
  ropa:    [4, ["S","M","L","XL","XXL"]]
};
const COLORS = {
  negro: ["Negro","#171717"], blanco: ["Blanco","#FFFFFF"], rojo: ["Rojo","#DC2626"],
  azul: ["Azul","#3B82F6"], verde: ["Verde","#16A34A"], dorado: ["Dorado","#D4AF37"],
  plata: ["Plata","#C0C0C0"], marron: ["Marron","#92400E"], rosa: ["Rosa","#EC4899"],
  gris: ["Gris","#6B7280"], cafe: ["Cafe","#A16207"], beige: ["Beige","#E7C9A9"]
};
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const cats = [
  "Anillos","Bolsos","Zapatos","Cadenas","Ropa","Relojes","Gafas","Gorras","Camisas","Pantalones","Carteras","Accesorios"
];
const catColor = ["#e0d9ff","#f4e3e3","#dbeafe","#fef3c7","#dcfce7","#e0e7ff","#ffe4e6","#f3e8ff","#fce7f3","#eef2ff","#fef9c3","#ecfdf5"];

// productos: [catIdx, nombre, precio, original?, desc, featured, {template|sizes, colors:[...]}]
const P = [
  [0,"Anillo Plata 925",45,60,"Anillo fino de plata 925 con acabado brillante.",1,{t:"anillos",colors:["plata","dorado"]}],
  [0,"Anillo Oro 18k",180,null,"Anillo de oro 18k elegante para toda ocasion.",1,{t:"anillos",colors:["dorado"]}],
  [0,"Anillo Acero Negro",30,null,"Anillo de acero inoxidable color negro mate.",0,{t:"anillos",colors:["negro","gris"]}],
  [0,"Anillo Esmeralda",95,120,"Anillo con piedra esmeralda sintetica.",0,null],
  [1,"Bolso de Cuero",85,110,"Bolso de cuero genuino con correa ajustable.",1,null],
  [1,"Cartera Crossbody",55,null,"Cartera pequeña tipo crossbody, ideal para el dia a dia.",0,{sizes:["S","M"],colors:["marron","negro","beige"]}],
  [1,"Mochila Urbana",70,null,"Mochila resistente con compartimento para laptop.",0,null],
  [1,"Bolso de Mano",120,150,"Bolso de mano elegante con detalles dorados.",0,null],
  [2,"Tenis Urbanos",65,85,"Tenis urbanos comodos para uso diario.",1,{t:"zapatos",colors:["blanco","negro"]}],
  [2,"Zapatos Formales",90,null,"Zapatos formales de cuero para oficina.",0,{t:"zapatos",colors:["negro","marron"]}],
  [2,"Deportivos Run",75,null,"Calzado deportivo ligero para correr.",1,{t:"zapatos",colors:["azul","rojo"]}],
  [2,"Sandalias Verano",45,null,"Sandalias comodas para el calor.",0,{t:"zapatos",colors:["beige","cafe"]}],
  [3,"Cadena 20mm",60,80,"Cadena de acero inoxidable de 20mm.",1,{t:"cadenas",colors:["plata","dorado"]}],
  [3,"Cadena 40mm",90,null,"Cadena gruesa de 40mm con cierre seguro.",0,{t:"cadenas",colors:["plata","negro"]}],
  [3,"Cadena 60mm",140,170,"Cadena premium de 60mm para lucir destacado.",0,{t:"cadenas",colors:["dorado"]}],
  [3,"Cadena Delgada",40,null,"Cadena fina de 20mm para uso casual.",0,null],
  [4,"Camiseta Basica",18,null,"Camiseta de algodon suave, tallas S a XXL.",1,{t:"ropa",colors:["blanco","negro","gris"]}],
  [4,"Sudadera Hoodie",45,60,"Sudadera con capucha y bolsillo canguro.",1,{t:"ropa",colors:["gris","azul","negro"]}],
  [4,"Jean Clasico",50,null,"Jean clasico de corte recto.",0,{sizes:["S","M","L","XL","XXL"],colors:["azul","negro"]}],
  [4,"Chaqueta Denim",60,75,"Chaqueta vaquera resistente.",0,{t:"ropa",colors:["azul"]}],
  [5,"Reloj Clasico",150,190,"Reloj clasico con correa de cuero.",1,{sizes:["S","M","L"],colors:["negro","marron"]}],
  [5,"Reloj Deportivo",120,null,"Reloj deportivo resistente al agua.",0,{t:"ropa",colors:["negro","azul","rojo"]}],
  [5,"Reloj Minimalista",95,null,"Reloj de diseño minimalista.",0,null],
  [5,"Reloj Premium",300,360,"Reloj premium con detalles dorados.",0,null],
  [6,"Gafas de Sol Polarizadas",55,70,"Gafas de sol con lentes polarizadas.",1,{t:"ropa",colors:["negro","cafe"]}],
  [6,"Gafas Retro",48,null,"Gafas de estilo retro, marco redondo.",0,{t:"ropa",colors:["negro","gris"]}],
  [6,"Gafas Deportivas",60,null,"Gafas deportivas con proteccion UV.",0,null],
  [6,"Gafas Aviador",65,80,"Gafas aviador clasicas.",0,null],
  [7,"Gorra Clasica",15,null,"Gorra clasica de algodon.",1,{sizes:["S","M","L","XL"],colors:["negro","blanco","azul","rojo"]}],
  [7,"Gorra Deportiva",20,null,"Gorra deportiva transpirable.",0,{t:"ropa",colors:["negro","gris"]}],
  [7,"Gorra Trucker",22,null,"Gorra trucker con malla trasera.",0,null],
  [7,"Gorra Snapback",25,32,"Gorra snapback de ajuste regulable.",0,null],
  [8,"Camisa Formal",40,50,"Camisa formal de manga larga.",1,{t:"ropa",colors:["blanco","azul","celeste"]}],
  [8,"Camisa Casual",35,null,"Camisa casual de algodon.",0,{t:"ropa",colors:["beige","verde","gris"]}],
  [8,"Camisa Cuadros",38,null,"Camisa a cuadros estilo flannel.",0,null],
  [8,"Camisa Slim Fit",42,null,"Camisa ajustada slim fit.",0,null],
  [9,"Pantalon Chino",45,55,"Pantalon chino comodo y versatil.",1,{t:"ropa",colors:["beige","marron","negro"]}],
  [9,"Pantalon de Vestir",55,null,"Pantalon de vestir para ocasion formal.",0,{t:"ropa",colors:["negro","gris"]}],
  [9,"Jogger Deportivo",35,null,"Pantalon jogger con elastico.",0,{t:"ropa",colors:["gris","negro"]}],
  [9,"Short Casual",28,null,"Short casual de verano.",0,null],
  [10,"Cartera de Mujer",65,85,"Cartera elegante para mujer.",1,{sizes:["S","M","L"],colors:["rojo","negro","beige","rosa"]}],
  [10,"Cartera de Hombre",70,null,"Cartera resistente de cuero para hombre.",0,{t:"ropa",colors:["negro","marron"]}],
  [10,"Billetera Slim",25,null,"Billetera delgada con varias secciones.",0,null],
  [10,"Monedero",20,null,"Monedero pequeño de cuero.",0,null],
  [11,"Pulsera Acero",25,35,"Pulsera de acero inoxidable.",1,{t:"cadenas",colors:["plata","negro"]}],
  [11,"Collar Perlas",50,65,"Collar de perlas elegantes.",0,null],
  [11,"Anillo Set Minimalista",35,null,"Set de 3 anillos minimalistas.",0,{t:"anillos",colors:["plata","dorado"]}],
  [11,"Pendientes Aro",28,null,"Pendientes de aro dorados.",0,null],
  [4,"Buso Deportivo",40,null,"Buso deportivo de tejido suave.",0,{t:"ropa",colors:["gris","azul"]}],
  [5,"Reloj Casio Clasico",80,null,"Reloj clasico de cuarzo.",0,null]
];
if (P.length !== 50) { console.error("Se definieron " + P.length + " productos, se esperaban 50"); process.exit(1); }

let sql = "";
sql += "-- Demo OX WhatShop: limpiar catalogo\n";
sql += "delete from product_variants where store_id = 1;\n";
sql += "delete from products where store_id = 1;\n";
sql += "delete from categories where store_id = 1;\n\n";

sql += "-- Categorias\n";
sql += "insert into categories (id, store_id, name, color, position) values\n";
sql += cats.map((n, i) => `(${i+1}, 1, '${n}', '${catColor[i]}', ${i+1})`).join(",\n") + ";\n";
sql += "select setval('categories_id_seq', 12, true);\n\n";

sql += "-- Productos\n";
P.forEach((p, idx) => {
  const id = idx + 1;
  const [, name, price, orig, desc, featured, variant] = p;
  sql += `insert into products (id, store_id, category_id, name, description, price, original_price, image, images, stock, featured, position)\n`;
  sql += `values (${id}, 1, ${p[0]+1}, '${name}', '${desc}', ${price}, ${orig || "null"}, null, '[]', ${rand(8, 40)}, ${featured ? "true" : "false"}, ${id});\n`;

  if (variant && variant.colors) {
    let sizes;
    if (variant.t) { sizes = TEMPLATES[variant.t][1]; }
    else if (variant.sizes) { sizes = variant.sizes; }
    const rows = [];
    let pos = 0;
    variant.colors.forEach((ck) => {
      const [cname, chex] = COLORS[ck] || [ck, "#888888"];
      sizes.forEach((sz) => {
        pos++;
        const stock = rand(0, 18);
        const vprice = (pos % 3 === 0) ? Math.round(price * 1.15) : "null";
        rows.push(`(${id}, 1, '${cname}', '${chex}', '${sz}', ${vprice}, ${stock}, ${pos}, '${cname} ${sz}')`);
      });
    });
    sql += `insert into product_variants (product_id, store_id, color, color_hex, size, price, stock, position, name) values\n`;
    sql += rows.join(",\n") + ";\n\n";
  } else {
    sql += "\n";
  }
});
sql += "select setval('products_id_seq', 50, true);\n";
console.log(sql);
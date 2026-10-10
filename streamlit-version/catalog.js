// Pink Lemonade catalog snapshot (from pinklemonademi.com, Oct 10 2026).
// Shared by the web page and the /api/chat function. Edit here to change what the assistant knows.
// [title, brand, price, sections, inStock sizes ("|"-separated), soldOut sizes, tile color]
export const PRODUCTS = [
["Raw Edge Long Sleeve Tee Wonderful World","Rylee + Cru",42.95,"Baby,Girl,Boy,New","3-6M|6-12M|12-18M|18-24M|2-3Y","","#8a96a3"],
["Pocketed Flannel Shirt Holiday Plaid","Rylee + Cru",58.95,"Baby,Boy,Holiday,New","6-12M|12-18M|18-24M|2-3Y|4-5Y","","#3f6b52"],
["Palmer Pant Holiday Plaid","Rylee + Cru",52.95,"Baby,Holiday,New","3-6M|6-12M|12-18M|18-24M|2-3Y","","#3f6b52"],
["Organic Long John Pajamas Holly Fleur","Rylee + Cru",48.95,"Baby,Holiday,New","0-3M|3-6M|6-12M|12-18M|18-24M","","#c9a98b"],
["Organic Long John Pajamas Gingerbread","Rylee + Cru",48.95,"Baby,Holiday,New","0-3M|3-6M|6-12M|12-18M|18-24M","","#b98a5e"],
["Noel Stocking Ruby Plaid","Rylee + Cru",38.95,"Holiday,Home,New","One size","","#a8324a"],
["Noel Stocking Candy Cane Lane","Rylee + Cru",38.95,"Holiday,Home,New","One size","","#c96f7d"],
["Noel Stocking Holiday Floral","Rylee + Cru",38.95,"Holiday,Home,New","One size","","#cbb59a"],
["Oliver Pant Toffee","Rylee + Cru",55.95,"Boy,New","2-3Y|4-5Y|6-7Y","","#9a6a43"],
["Lucian Pant Toffee","Rylee + Cru",55.95,"Baby,Boy,New","0-3M|3-6M|6-12M|12-18M|18-24M|2-3Y","","#9a6a43"],
["Fuzzy Cardigan Ruby","Rylee + Cru",66.95,"Girl,Holiday,New","12-18M|18-24M|2-3Y|4-5Y|6-7Y","","#a8324a"],
["Little Knot Headband Vintage Plaid","Rylee + Cru",12.95,"Baby,Girl,Holiday","One size","","#b0545f"],
["Freya Romper Holiday Plaid","Rylee + Cru",65.95,"Baby,Holiday,New","0-3M|3-6M|6-12M|12-18M|18-24M","","#3f6b52"],
["Long Sleeve Tee Santa","Rylee + Cru",39.95,"Baby,Holiday,New","0-3M|3-6M|6-12M|12-18M|18-24M|2-3Y","","#d8c6ad"],
["Freya Romper Bows","Rylee + Cru",58.95,"Baby,Girl,Holiday,New","0-3M|3-6M|6-12M|12-18M|18-24M","","#a8324a"],
["Fran Dress Holiday Plaid","Rylee + Cru",88.95,"Girl,Holiday,New","2-3Y|4-5Y|6-7Y|8-9Y","","#3f6b52"],
["Fran Dress Bows","Rylee + Cru",88.95,"Girl,Holiday,New","2-3Y|4-5Y|6-7Y|8-9Y","","#a8324a"],
["Ruffle Collar Dress Ruby Bloom","Rylee + Cru",58.95,"Baby,Girl,New","0-3M|3-6M|6-12M|12-18M|18-24M|2-3Y","","#d9c7b4"],
["Relaxed Sweatshirt Merry & Bright","Rylee + Cru",52.95,"Baby,Girl,Boy,Holiday,New","3-6M|6-12M|12-18M|18-24M|2-3Y|4-5Y","","#a8324a"],
["Chenille Blush Vest","Angel Dear",42.95,"Girl,New","2T|3T|4T|5-6Y|7-8Y","","#e7b7bd"],
["Meowdy Boxy Tee","Tiny Whales",32.95,"Girl","2T|3T|4T|5|6|7","","#d78f9c"],
["Hold Your Horses L/S Tee","Tiny Whales",38.95,"Girl","2T|3T|4T|5|6|7|8","","#c79a6d"],
["Cotton Candy Lined Sherpa Jacket","Tiny Whales",71.95,"Girl","4T|5|7|8|10","6","#f1b6c9"],
["L/S 2-Piece Set, Pink Teddy Picnic","Spearmint Love",34.95,"Baby,Girl","18-24M|2|3|4|5","","#f0aebf"],
["L/S 2-Piece Set, Coquette Cherries","Spearmint Love",34.95,"Baby,Girl","12-18M|18-24M|2T|3|4|5|6","","#c8414f"],
["Mayoral Girl Sweatpants","Mayoral",36.95,"Girl","2|3|4|5|6|7|8","","#b7a7b3"],
["Ombre Puff Sleeve Sequin Dress","Mila & Rose",52.95,"Girl","2Y|3Y|4Y|5/6Y|7/8Y","","#d58fc0"],
["Vintage Pink Velvet Dress","Mila & Rose",34.95,"Baby,Girl,Holiday","6-12M|12-24M|2Y|3Y|4Y|5/6Y|7/8Y","","#d87f97"],
["Party Time Ruffle Dress","Mila & Rose",30.95,"Baby,Girl","12-24M|2Y|3Y|4Y|5/6Y","","#e99ab0"],
["Neon Pink Puff Sleeve Sequin Dress","Mila & Rose",52.95,"Girl","2Y|3Y|4Y|5/6Y|7/8Y","","#ec4f94"],
["Periwinkle Heart Puff Sequin Dress","Mila & Rose",52.95,"Girl","2Y|3Y|4Y|5/6Y","7/8Y","#8e95d9"],
["Pink Rainbow Puff Sleeve Dress","Mila & Rose",52.95,"Girl","2Y|3Y|4Y|5/6Y","7/8Y","#f29bb6"],
["Leopard Rib Lettuce Edge Tunic Top","Angel Dear",32.95,"Baby,Girl","6-12M|12-18M|18-24M|2T|3T","4T","#b88d62"],
["Leopard French Terry Cargo Pants","Angel Dear",36.95,"Baby,Girl","6-12M|12-18M|18-24M|4T","2T|3T","#b88d62"],
["Fox Bitsy Crinkle Sensory Toy Teether","Itzy Ritzy",18.95,"Baby,Play","One size","","#d9824a"],
["CozyChic Bear Buddie, Cream","Barefoot Dreams",46.95,"Baby,Play","One size","","#e6dccd"],
["Heirloom Floral Blanket, Dusty Rose","Barefoot Dreams",89.95,"Baby,Home","One size","","#d7a3a6"],
["CozyChic Touchdown Buddie","Barefoot Dreams",58.95,"Baby,Play","One size","","#8b6a4f"],
["Hi Pecan Crewneck Sweater","Huggalugs",48.95,"Baby","12-18M","0-6M|6-12M","#a07650"],
["Tee Time Golf Silicone Teether","Calla & Friends",14.95,"Baby,Play","One size","","#8fbf8a"],
["Nursery Magic Cream Modal Footie","Magnetic Me",40.00,"Baby","NB|0-3M|6-9M","3-6M","#efe3cf"],
["Bamboo Baby Gown + Hat Set Bloom","Rylee + Cru",36.95,"Baby","One size","","#e8d8c6"],
["Thanksgiving Friends (book)","Penguin Random House",7.99,"Play,Baby","One size","","#d39a4a"],
["Itzy Snack Pal Snack Cup","Itzy Ritzy",11.95,"Baby","Bear|Kitty","","#c9a98b"],
["Mallard Duck Bitzy Crinkle","Itzy Ritzy",18.95,"Baby,Play","One size","","#4f8a6b"],
["Pretty Bows Swaddle Blanket","Angel Dear",30.95,"Baby","One size","","#f2dfe2"],
["Bella Rose Stripe Swaddle Blanket","Angel Dear",30.95,"Baby","One size","","#ef9fb2"],
["Blue Bows and Flowers Swaddle Blanket","Angel Dear",30.95,"Baby","One size","","#8fb0d8"],
["Bestie Dogs Pink Swaddle Blanket","Angel Dear",30.95,"Baby","One size","","#f2b4c3"],
["Bows and Hearts Swaddle Blanket","Angel Dear",30.95,"Baby","One size","","#f0c4cd"],
["Mon Ami Azure Elephant","Mon Ami",36.95,"Baby,Play","One size","","#7ea7cf"],
["You're My Little Mama Bear (book)","Simon & Schuster",9.99,"Baby,Play","One size","","#b98a5e"],
["First Words (book)","Simon & Schuster",9.99,"Baby,Play","One size","","#6fa3c9"],
["Itzy Ring Pal","Itzy Ritzy",12.95,"Baby,Play","Pink Kitty|Taupe Bear","","#e7b3c0"],
["Ulrich Wolf","Jellycat",83.00,"Play,Holiday","One size","","#9aa0a8"],
["Amuseables Perta Snow Boot","Jellycat",70.00,"Play,Holiday","One size","","#c9c3d6"],
["Amuseables Fitswell Mitten","Jellycat",43.00,"Play,Holiday","One size","","#c7525f"],
["Amuseables Mullover Spiced Drink","Jellycat",45.00,"Play,Holiday","One size","","#a8463e"],
["Amuseables Silver Star","Jellycat",35.00,"Play,Holiday","One size","","#b9bcc4"],
["Munro Scottie Dog Winter Jumper","Jellycat",60.00,"Play,Holiday","One size","","#3b3b40"],
["Amuseables Pomilly","Jellycat",55.00,"Play","One size","","#e6a0b2"],
["Amuseables Happy Boiled Egg","Jellycat",23.00,"Play","One size","","#f2d36b"],
["Growlston Gargoyle","Jellycat",45.00,"Play","One size","","#8f9296"],
["Amuseables Vampop Drink","Jellycat",45.00,"Play","One size","","#7a3f6e"],
["Amuseables Garlic","Jellycat",30.00,"Play","One size","","#e8e1cf"],
["Ghost Bob","Jellycat",28.00,"Play","One size","","#d9dade"],
["Amuseables Flickerty Candle","Jellycat",28.00,"Play","One size","","#f0c56a"],
["Rufferty Puppy Wizard Outfit","Jellycat",70.00,"Play","One size","","#5b4a8a"],
["Pinchsnap Crab","Jellycat",60.00,"Play","One size","","#e0684f"],
["Bashful Giraffe Blankie","Jellycat",80.00,"Baby,Play","One size","","#e8c27a"],
["If I Were a Puppy (board book)","Jellycat",16.00,"Baby,Play","One size","","#c79a6d"],
["If I Were an Octopus (board book)","Jellycat",16.00,"Baby,Play","One size","","#d77f9a"],
["If I Were a Bunny (board book)","Jellycat",16.00,"Baby,Play","One size","","#e3c9b7"],
["Bartholomew Bear Shoulder Bag","Jellycat",40.00,"Play","One size","","#9a6a43"],
["Amuseables Croissant","Jellycat",25.00,"Play","One size","","#d9a259"],
["Amuseables Peanut Star Student Outfit","Jellycat",30.00,"Play","One size","","#7f90b8"],
["Amuseables Mirielle St. Honoré Cake","Jellycat",38.00,"Play","One size","","#f1c9d4"],
["Amuseables Pair of Olives","Jellycat",45.00,"Play","One size","","#7c8a4a"],
["Amuseables Margaux Madeleine","Jellycat",28.00,"Play","One size","","#e3b773"],
["Amuseables Carole Canelé","Jellycat",25.00,"Play","One size","","#9b5a35"],
["Amuseables Sweetcorn","Jellycat",55.00,"Play","One size","","#efcf54"],
["Quilted Ruffle Tote, Maggie's Bouquet","Lilly Pulitzer",60.95,"Her","One size","","#ef7fa6"],
["Quilted Ruffle Pouch, Maggie's Bouquet","Lilly Pulitzer",34.95,"Her","One size","","#ef7fa6"],
["Coin Purse, Caning with Monkey","Lilly Pulitzer",19.95,"Her","One size","","#58b5b0"],
["Multicolor Dilly Dally Hair Clip","Etta & East",18.00,"Her","One size","","#e59bc1"],
["Multicolor Mother Hair Clip","Etta & East",18.00,"Her","One size","","#9fc6e0"],
["How Lucky Are We Sweatshirt","Etta & East",78.95,"Her","S/M|L/XL","","#d6c2a6"],
["Mahjong Wine Charms","Two's Company",28.95,"Her,Home","One size","","#3f7d6a"],
["Cream, Gold, Green & Gray Pom Hat","Panache",26.95,"Her,Holiday","One size","","#cdbf9c"],
["Cream & Pink Floral Mittens","Panache",26.95,"Her,Holiday","One size","","#efc6cc"],
["Cream & Pink Floral Pom Hat","Panache",26.95,"Her,Holiday","One size","","#efc6cc"],
["Polka Dot Sherpa","Buttermelon",68.95,"Her","S|L","M","#efe6da"],
["Mallard Duck Pullover","Sunday Edition",58.95,"Her","Lavender, L","Green; sizes S and M","#b8a6d6"],
["Teddy Floral Pouch","The Darling Effect",20.95,"Her","One size","","#e7c3b5"],
["Claw Clip, Maple Gingham","The Darling Effect",13.95,"Her","One size","","#b5643d"],
["Word Up Claw Clip, Bridal","The Darling Effect",13.95,"Her","One size","","#f2ece4"]
].map(([title,brand,price,cats,inS,outS,color],i)=>({id:i,title,brand,price,cats:cats.split(","),inStock:inS?inS.split("|"):[],soldOut:outS?outS.split("|"):[],color}));

export const STORE = `Store facts (from pinklemonademi.com):
- Pink Lemonade is a family-owned boutique with 4 brick-and-mortar locations in Michigan (Grand Rapids area). Cute things for children, home and her; "the art of gift giving and celebrating the little things."
- Free shipping on orders over $100.
- Shop sections: New Arrivals, Baby (newborn, baby girl, baby boy, baby essentials), Girl (2-6Y, plus PL Girl 8-14Y), Boy (2-8Y), Play (arts & crafts, books, Jellycat, toys), Gift Shop (gifts for her, mama, baby, girl, boy).
- Brands carried include Angel Dear, Feather 4 Arrow, Hatley, Jellycat, In My Jammers, Lola and the Boys, Mayoral, Mud Pie, Mila & Rose, Molo, Quincy Mae, Rylee + Cru, Tea Collection, Tun Tun, Itzy Ritzy, Barefoot Dreams, Lilly Pulitzer, Etta & East.
- Instagram and Facebook: @pinklemonadegr.
- NOT KNOWN in this preview: individual store addresses, hours, phone number, return/exchange policy, gift card details. For those, say a team member will confirm and suggest messaging @pinklemonadegr on Instagram.`;

export function catalogText(){
  return PRODUCTS.map(p=>`- ${p.title} | ${p.brand} | $${p.price.toFixed(2)} | ${p.cats.join("/")} | in stock: ${p.inStock.join(", ")||"none"}${p.soldOut.length?` | SOLD OUT: ${p.soldOut.join(", ")}`:""}`).join("\n");
}

export function buildRules(){
  return `You are the friendly shop assistant on the Pink Lemonade boutique website. Answer customer questions using ONLY the store facts and the live catalog below. Keep replies short (2-5 sentences or a short list), warm and plain, no markdown headings, no bold. When you recommend products give the name, brand and price, and mention sizes in stock. If a size is listed as SOLD OUT, say so and suggest the nearest available size or a similar item. If something is not in the catalog, say you don't see it online right now and that stores may carry more, so a team member can check. Never invent products, prices, sizes, addresses, hours or policies.

${STORE}

Live catalog (product | brand | price | sections | sizes):
${catalogText()}`;
}

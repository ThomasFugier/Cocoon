const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const defaultOutputPath = path.join(root, "content", "desire-packs.json");

const requiredColumns = [
  "version",
  "mis_a_jour",
  "ordre_pack",
  "categorie_pack",
  "nom_pack",
  "payant",
  "description_pack",
  "ordre_carte",
  "id_carte",
  "titre_carte",
  "emoji",
  "texte_carte",
  "type_carte",
  "ambiance",
];

const emojiFallbackAliases = {
  [String.fromCodePoint(0x1FAE6)]: "👄",
};

function normalizeEmoji(value) {
  return emojiFallbackAliases[value] ?? value;
}

function parseCsv(text) {
  const rows = [];
  let cell = "";
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === "\"") {
      quoted = true;
    } else if (char === "," || char === ";") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  if (!rows.length) {
    return [];
  }

  const header = rows[0].map((value) => value.replace(/^\uFEFF/, "").trim());
  return rows
    .slice(1)
    .filter((values) => values.some((value) => value.trim()))
    .map((values, rowIndex) => {
      const record = { __line: rowIndex + 2 };
      header.forEach((column, columnIndex) => {
        record[column] = values[columnIndex]?.trim() ?? "";
      });
      return record;
    });
}

function assertRequiredColumns(row) {
  const missingColumns = requiredColumns.filter((column) => !(column in row));

  if (missingColumns.length) {
    throw new Error(`Colonnes manquantes dans le CSV: ${missingColumns.join(", ")}`);
  }
}

function asPositiveInteger(value, label, line) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Ligne ${line}: ${label} doit etre un entier positif.`);
  }

  return parsed;
}

function normalizePaid(value) {
  const normalized = value.trim().toLowerCase();

  if (["oui", "yes", "true", "1"].includes(normalized)) {
    return true;
  }

  if (["non", "no", "false", "0", ""].includes(normalized)) {
    return false;
  }

  throw new Error(`Valeur payant inconnue: "${value}".`);
}

function parseCsvContent(csvPath) {
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));

  if (!rows.length) {
    throw new Error("Le CSV ne contient aucune carte.");
  }

  assertRequiredColumns(rows[0]);

  const ids = new Set();
  const packsByCategory = new Map();

  rows.forEach((row) => {
    const line = row.__line;
    const category = row.categorie_pack;
    const label = row.nom_pack || category;
    const packOrder = asPositiveInteger(row.ordre_pack, "ordre_pack", line);
    const cardOrder = asPositiveInteger(row.ordre_carte, "ordre_carte", line);

    if (!category || !row.id_carte || !row.titre_carte || !row.texte_carte) {
      throw new Error(`Ligne ${line}: categorie_pack, id_carte, titre_carte et texte_carte sont obligatoires.`);
    }

    if (ids.has(row.id_carte)) {
      throw new Error(`Ligne ${line}: id_carte "${row.id_carte}" est duplique.`);
    }
    ids.add(row.id_carte);

    const paid = normalizePaid(row.payant);
    const description = row.description_pack;
    const existingPack = packsByCategory.get(category);

    if (existingPack) {
      if (existingPack.order !== packOrder || existingPack.label !== label || existingPack.paid !== paid) {
        throw new Error(`Ligne ${line}: metadata incoherente pour le pack "${category}".`);
      }

      if (existingPack.description !== description) {
        throw new Error(`Ligne ${line}: description_pack incoherente pour le pack "${category}".`);
      }
    } else {
      packsByCategory.set(category, {
        order: packOrder,
        category,
        label,
        paid,
        description,
        cards: [],
      });
    }

    packsByCategory.get(category).cards.push({
      order: cardOrder,
      id: row.id_carte,
      title: row.titre_carte,
      emoji: normalizeEmoji(row.emoji),
      blurb: row.texte_carte,
      kind: row.type_carte || "practice",
      mood: row.ambiance || "sensuel",
      ...(row.safety || row.securite ? { safety: row.safety || row.securite } : {}),
    });
  });

  const versions = [...new Set(rows.map((row) => row.version).filter(Boolean))];
  const updatedAts = [...new Set(rows.map((row) => row.mis_a_jour).filter(Boolean))];

  if (versions.length > 1) {
    throw new Error(`Versions CSV multiples: ${versions.join(", ")}.`);
  }

  if (updatedAts.length > 1) {
    throw new Error(`Dates mis_a_jour multiples: ${updatedAts.join(", ")}.`);
  }

  return {
    version: Number.parseInt(versions[0] ?? "1", 10),
    updatedAt: updatedAts[0] ?? new Date().toISOString().slice(0, 10),
    packs: [...packsByCategory.values()]
      .sort((left, right) => left.order - right.order)
      .map(({ order: _order, cards, ...pack }) => ({
        ...pack,
        cards: cards
          .sort((left, right) => left.order - right.order)
          .map(({ order: _cardOrder, ...card }) => card),
      })),
  };
}

function main() {
  const csvPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, "cocoon_packs_cartes.csv");
  const outputPath = process.argv[3] ? path.resolve(process.argv[3]) : defaultOutputPath;
  const content = parseCsvContent(csvPath);

  fs.writeFileSync(outputPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
  console.log(`Imported ${content.packs.reduce((total, pack) => total + pack.cards.length, 0)} cards from ${path.relative(root, csvPath)}.`);
  console.log(`Updated ${path.relative(root, outputPath)}.`);
}

main();

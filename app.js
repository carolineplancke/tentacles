const $ = selector => document.querySelector(selector);

const elements = {
  input: $('#orgInput'),
  gallery: $('#gallery'),
  status: $('#status'),
  warnings: $('#warnings'),

  primary: $('#primaryColor'),
  primaryHex: $('#primaryHex'),

  accent1: $('#accent1'),
  accent1Hex: $('#accent1Hex'),

  accent2: $('#accent2'),
  accent2Hex: $('#accent2Hex'),

  bg: $('#backgroundColor'),
  backgroundHex: $('#backgroundHex'),

  font: $('#fontFamily'),
  perPage: $('#cardsPerPage'),
  cols: $('#columnCount'),
  allDesc: $('#countAllDescendants'),

  allBtn: $('#downloadAllBtn')
};

// Every export is a fixed 37.68 cm x 23.12 cm page so the images drop into the
// same slide placeholder. SVG user units are 1/96 inch, giving 1424 x 874 px.
const PAGE_WIDTH_CM = 37.68;
const PAGE_HEIGHT_CM = 23.12;
const PX_PER_CM = 96 / 2.54;

const PAGE_WIDTH = Math.round(
  PAGE_WIDTH_CM * PX_PER_CM
);

const PAGE_HEIGHT = Math.round(
  PAGE_HEIGHT_CM * PX_PER_CM
);

const EXAMPLE = `Yan Wang | SVP, Product | Product strategy, portfolio leadership and enterprise alignment
  Caroline Plancke | EA, Product | Executive operations and coordination
  Sovan Sahu | VP, Data & Analytics | Data strategy, governance, engineering and analytics
    Omar Daudi | Director, Data Governance | Data governance and stewardship
      Analyst One | Senior Analyst | Governance operations
      Analyst Two | Analyst | Data quality
    Richard Mak | Director, Data Engineering & Operations | Data platforms and engineering operations
      Engineer One | Manager | Data engineering
    Daniel Ramirez Garcia | Manager, Data Scientist | Advanced analytics and data science
  Director Two | Director, Product | Product delivery and experience
    Report One | Manager, Product | Member journeys
    Report Two | Senior Product Manager | Platform roadmap
      Direct One | Product Manager | Digital products
      Direct Two | Product Analyst | Product insights
    Report Three | Product Manager | Partner experience`;

function parseOrg(text) {
  const lines = text
    .split(/\r?\n/)
    .filter(line => line.trim());

  const roots = [];
  const stack = [];
  const warnings = [];

  lines.forEach((line, index) => {
    const whitespace = line
      .match(/^\s*/)[0]
      .replace(/\t/g, '  ')
      .length;

    if (whitespace % 2) {
      warnings.push(
        `Line ${index + 1}: odd indentation was rounded down.`
      );
    }

    const level = Math.floor(whitespace / 2);

    const parts = line
      .trim()
      .split('|')
      .map(part => part.trim());

    const node = {
      id: `n${index}`,
      name: parts[0] || 'Unnamed',
      title: parts[1] || '',
      responsibility: parts.slice(2).join(' | '),
      children: [],
      level
    };

    if (level === 0) {
      roots.push(node);
    } else {
      const parent = stack[level - 1];

      if (!parent) {
        warnings.push(
          `Line ${index + 1}: indentation has no parent; moved to top level.`
        );

        roots.push(node);
        node.level = 0;
      } else {
        parent.children.push(node);
      }
    }

    stack[node.level] = node;
    stack.length = node.level + 1;
  });

  return {
    roots,
    warnings
  };
}

function descendants(node) {
  return node.children.reduce(
    (total, child) => total + 1 + descendants(child),
    0
  );
}

function countStaff(node) {
  return elements.allDesc.checked
    ? descendants(node)
    : node.children.length;
}

function esc(value = '') {
  return String(value).replace(
    /[&<>"']/g,
    character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;'
    })[character]
  );
}

function wrap(text, maxCharacters = 34) {
  const words = String(text || '')
    .split(/\s+/)
    .filter(Boolean);

  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    const nextLine = currentLine
      ? `${currentLine} ${word}`
      : word;

    if (
      nextLine.length > maxCharacters &&
      currentLine
    ) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.slice(0, 3);
}

function textLines(
  lines,
  x,
  y,
  size,
  color,
  weight = '400',
  anchor = 'start',
  gap = 1.28
) {
  if (!lines.length) {
    return '';
  }

  const tspans = lines
    .map((line, index) => {
      const dy = index ? size * gap : 0;

      return `
        <tspan x="${x}" dy="${dy}">
          ${esc(line)}
        </tspan>
      `;
    })
    .join('');

  return `
    <text
      x="${x}"
      y="${y}"
      font-size="${size}"
      fill="${color}"
      font-weight="${weight}"
      text-anchor="${anchor}"
    >
      ${tspans}
    </text>
  `;
}

function settings() {
  return {
    primary: elements.primary.value,
    a1: elements.accent1.value,
    a2: elements.accent2.value,
    bg: elements.bg.value,
    font: elements.font.value
  };
}

function svgShell(body) {
  const currentSettings = settings();

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${PAGE_WIDTH_CM}cm"
      height="${PAGE_HEIGHT_CM}cm"
      viewBox="0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}"
      role="img"
    >
      <rect
        width="100%"
        height="100%"
        fill="${currentSettings.bg}"
      />

      <g font-family="${esc(currentSettings.font)}">
        ${body}
      </g>
    </svg>
  `;
}

function fitToPage(body, layoutWidth, layoutHeight) {
  const scale = Math.min(
    PAGE_WIDTH / layoutWidth,
    PAGE_HEIGHT / layoutHeight
  );

  const offsetX =
    (PAGE_WIDTH - layoutWidth * scale) / 2;

  return `
    <g
      transform="translate(${offsetX.toFixed(2)}, 0) scale(${scale.toFixed(5)})"
    >
      ${body}
    </g>
  `;
}

function leaderBanner(node, width, y = 40) {
  const currentSettings = settings();

  const x = width * 0.2;
  const bannerWidth = width * 0.6;
  const bannerHeight = 92;

  const responsibility = node.responsibility
    ? textLines(
        wrap(node.responsibility, 70),
        x + 20,
        y + 84,
        12,
        '#dcebea',
        '400'
      )
    : '';

  return `
    <rect
      x="${x}"
      y="${y}"
      width="${bannerWidth}"
      height="${bannerHeight}"
      rx="8"
      fill="${currentSettings.primary}"
    />

    <text
      x="${x + 20}"
      y="${y + 35}"
      fill="white"
      font-size="24"
      font-weight="700"
    >
      ${esc(node.name)}
    </text>

    <text
      x="${x + 20}"
      y="${y + 63}"
      fill="white"
      font-size="16"
    >
      ${esc(node.title)}
    </text>

    ${responsibility}
  `;
}

function card(node, x, y, width, height, index) {
  const currentSettings = settings();

  const accent = index % 2
    ? currentSettings.a2
    : currentSettings.a1;

  const staff = countStaff(node);

  const responsibilityLabel = (
    node.responsibility || 'TEAM'
  )
    .toUpperCase()
    .slice(0, 34);

  const staffFooter = staff > 0
    ? `
      <line
        x1="${x + 22}"
        y1="${y + height - 78}"
        x2="${x + width - 22}"
        y2="${y + height - 78}"
        stroke="#d9e0eb"
      />

      <text
        x="${x + 22}"
        y="${y + height - 38}"
        font-size="13"
        fill="#5d6b85"
      >
        ${staff} Staff Reports
      </text>
    `
    : '';

  const accessibleTitle = node.responsibility
    ? `<title>${esc(node.responsibility)}</title>`
    : '';

  return `
    <g>
      ${accessibleTitle}

      <rect
        x="${x}"
        y="${y}"
        width="${width}"
        height="${height}"
        rx="7"
        fill="#ffffff"
        stroke="#cfd8e8"
        stroke-width="2"
      />

      <rect
        x="${x}"
        y="${y}"
        width="${width}"
        height="12"
        fill="${accent}"
      />

      <text
        x="${x + 22}"
        y="${y + 52}"
        font-size="14"
        font-weight="700"
        fill="${accent}"
      >
        ${String(index + 1).padStart(2, '0')} ${esc(responsibilityLabel)}
      </text>

      ${textLines(
        wrap(node.name, 30),
        x + 22,
        y + 112,
        22,
        '#182236',
        '700'
      )}

      ${textLines(
        wrap(node.title, 40),
        x + 22,
        y + 162,
        14,
        '#5d6b85',
        '400'
      )}

      ${staffFooter}
    </g>
  `;
}

function calculateColumns(numberOfChildren) {
  const selectedValue = elements.cols
    ? elements.cols.value
    : 'auto';

  if (selectedValue !== 'auto') {
    const selectedColumns = Number(selectedValue);

    if (
      Number.isFinite(selectedColumns) &&
      selectedColumns > 0
    ) {
      return selectedColumns;
    }
  }

  if (numberOfChildren <= 3) {
    return Math.max(numberOfChildren, 1);
  }

  if (numberOfChildren <= 8) {
    return 4;
  }

  if (numberOfChildren <= 15) {
    return 5;
  }

  return 6;
}

function makePage(leader, children, label) {
  const columns = calculateColumns(children.length);

  const cardWidth = 320;
  const cardHeight = 300;
  const gap = 12;
  const rowGap = 18;
  const margin = 54;
  const cardStartY = 196;

  const rows = Math.ceil(
    children.length / columns
  );

  const gridWidth =
    columns * cardWidth +
    (columns - 1) * gap;

  const layoutWidth = Math.max(
    PAGE_WIDTH,
    margin * 2 + gridWidth
  );

  const layoutHeight = Math.max(
    PAGE_HEIGHT,
    cardStartY +
      rows * (cardHeight + rowGap) +
      42
  );

  const startX =
    (layoutWidth - gridWidth) / 2;

  let body = leaderBanner(
    leader,
    layoutWidth
  );

  children.forEach((node, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    const x =
      startX +
      column * (cardWidth + gap);

    const y =
      cardStartY +
      row * (cardHeight + rowGap);

    body += card(
      node,
      x,
      y,
      cardWidth,
      cardHeight,
      index
    );
  });

  return {
    name: label,
    svg: svgShell(
      fitToPage(
        body,
        layoutWidth,
        layoutHeight
      )
    ),
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT
  };
}

function flattenLeaders(nodes, output = []) {
  nodes.forEach(node => {
    if (node.children.length) {
      output.push(node);
    }

    flattenLeaders(
      node.children,
      output
    );
  });

  return output;
}

function buildCharts(roots) {
  if (!roots.length) {
    return [];
  }

  const pages = [];

  const cardsPerPage = Number(
    elements.perPage.value
  );

  roots.forEach((root, rootIndex) => {
    for (
      let startIndex = 0;
      startIndex < root.children.length;
      startIndex += cardsPerPage
    ) {
      const children = root.children.slice(
        startIndex,
        startIndex + cardsPerPage
      );

      const summaryNumber =
        Math.floor(startIndex / cardsPerPage) + 1;

      const summaryLabel = roots.length > 1
        ? `Summary ${rootIndex + 1}`
        : 'Summary';

      const pageLabel =
        root.children.length > cardsPerPage
          ? `${summaryLabel} ${summaryNumber}`
          : summaryLabel;

      pages.push(
        makePage(
          root,
          children,
          pageLabel
        )
      );
    }

    flattenLeaders(root.children).forEach(
      leader => {
        for (
          let startIndex = 0;
          startIndex < leader.children.length;
          startIndex += cardsPerPage
        ) {
          const children = leader.children.slice(
            startIndex,
            startIndex + cardsPerPage
          );

          const pageNumber =
            Math.floor(startIndex / cardsPerPage) + 1;

          const pageLabel =
            leader.children.length > cardsPerPage
              ? `${leader.name} ${pageNumber}`
              : leader.name;

          pages.push(
            makePage(
              leader,
              children,
              pageLabel
            )
          );
        }
      }
    );
  });

  return pages;
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') ||
    'org-chart';
}

function download(blob, fileName) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function svgBlob(svg) {
  return new Blob(
    [svg],
    {
      type: 'image/svg+xml;charset=utf-8'
    }
  );
}

function svgToPng(page) {
  const image = new Image();
  const url = URL.createObjectURL(
    svgBlob(page.svg)
  );

  image.onload = () => {
    const scale = 2;
    const canvas = document.createElement('canvas');

    canvas.width =
      page.width * scale;

    canvas.height =
      page.height * scale;

    const context = canvas.getContext('2d');

    context.scale(
      scale,
      scale
    );

    context.drawImage(
      image,
      0,
      0,
      page.width,
      page.height
    );

    URL.revokeObjectURL(url);

    canvas.toBlob(
      blob => {
        if (blob) {
          download(
            blob,
            `${slug(page.name)}.png`
          );
        }
      },
      'image/png'
    );
  };

  image.onerror = () => {
    URL.revokeObjectURL(url);

    elements.status.textContent =
      'The PNG could not be created. Try downloading the SVG instead.';
  };

  image.src = url;
}

function updateHexFields() {
  if (elements.primaryHex) {
    elements.primaryHex.value =
      elements.primary.value.toUpperCase();
  }

  if (elements.accent1Hex) {
    elements.accent1Hex.value =
      elements.accent1.value.toUpperCase();
  }

  if (elements.accent2Hex) {
    elements.accent2Hex.value =
      elements.accent2.value.toUpperCase();
  }

  if (elements.backgroundHex) {
    elements.backgroundHex.value =
      elements.bg.value.toUpperCase();
  }
}

function syncColor(colorElement, hexElement) {
  if (!colorElement || !hexElement) {
    return;
  }

  colorElement.addEventListener(
    'input',
    () => {
      hexElement.value =
        colorElement.value.toUpperCase();

      if (currentPages.length) {
        render();
      }
    }
  );

  hexElement.addEventListener(
    'input',
    () => {
      const normalizedValue =
        hexElement.value.trim();

      if (
        /^#[0-9A-Fa-f]{6}$/.test(
          normalizedValue
        )
      ) {
        colorElement.value =
          normalizedValue;

        if (currentPages.length) {
          render();
        }
      }
    }
  );

  hexElement.addEventListener(
    'blur',
    () => {
      hexElement.value =
        colorElement.value.toUpperCase();
    }
  );
}

let currentPages = [];

function render() {
  const parsed = parseOrg(
    elements.input.value
  );

  currentPages = buildCharts(
    parsed.roots
  );

  elements.warnings.hidden =
    !parsed.warnings.length;

  elements.warnings.innerHTML =
    parsed.warnings
      .map(
        warning =>
          `<div>${esc(warning)}</div>`
      )
      .join('');

  if (!currentPages.length) {
    elements.gallery.className =
      'gallery empty-state';

    elements.gallery.innerHTML = `
      <div>
        <strong>Add a team structure first.</strong>
      </div>
    `;

    elements.status.textContent =
      'No valid people found.';

    elements.allBtn.disabled = true;

    return;
  }

  elements.gallery.className =
    'gallery';

  elements.status.textContent =
    `${currentPages.length} image${
      currentPages.length === 1
        ? ''
        : 's'
    } generated at ${PAGE_WIDTH_CM} × ${PAGE_HEIGHT_CM} cm.`;

  elements.allBtn.disabled = false;

  elements.gallery.innerHTML =
    currentPages
      .map(
        (page, index) => `
          <article class="chart-item">
            <div class="chart-meta">
              <strong>
                ${esc(page.name)}
              </strong>

              <div class="chart-actions">
                <button
                  class="secondary"
                  data-svg="${index}"
                >
                  SVG
                </button>

                <button
                  class="secondary"
                  data-png="${index}"
                >
                  PNG
                </button>
              </div>
            </div>

            <div class="chart-scroll">
              ${page.svg}
            </div>
          </article>
        `
      )
      .join('');
}

$('#generateBtn').addEventListener(
  'click',
  render
);

$('#exampleBtn').addEventListener(
  'click',
  () => {
    elements.input.value = EXAMPLE;
    render();
  }
);

$('#saveBtn').addEventListener(
  'click',
  () => {
    const savedData = {
      input: elements.input.value,

      colors: [
        elements.primary.value,
        elements.accent1.value,
        elements.accent2.value,
        elements.bg.value
      ],

      font: elements.font.value,
      per: elements.perPage.value,

      columns: elements.cols
        ? elements.cols.value
        : 'auto',

      all: elements.allDesc.checked
    };

    localStorage.setItem(
      'orgChartStudio',
      JSON.stringify(savedData)
    );

    elements.status.textContent =
      'Saved in this browser.';
  }
);

$('#loadBtn').addEventListener(
  'click',
  () => {
    const savedData = JSON.parse(
      localStorage.getItem(
        'orgChartStudio'
      ) || 'null'
    );

    if (!savedData) {
      elements.status.textContent =
        'No saved chart was found in this browser.';

      return;
    }

    elements.input.value =
      savedData.input || '';

    [
      elements.primary,
      elements.accent1,
      elements.accent2,
      elements.bg
    ].forEach(
      (element, index) => {
        element.value =
          savedData.colors?.[index] ||
          element.value;
      }
    );

    elements.font.value =
      savedData.font ||
      elements.font.value;

    elements.perPage.value =
      savedData.per || 6;

    if (elements.cols) {
      elements.cols.value =
        savedData.columns || 'auto';
    }

    elements.allDesc.checked =
      savedData.all !== false;

    updateHexFields();
    render();
  }
);

elements.gallery.addEventListener(
  'click',
  event => {
    const svgIndex =
      event.target.dataset.svg;

    const pngIndex =
      event.target.dataset.png;

    if (svgIndex !== undefined) {
      const page =
        currentPages[Number(svgIndex)];

      download(
        svgBlob(page.svg),
        `${slug(page.name)}.svg`
      );
    }

    if (pngIndex !== undefined) {
      const page =
        currentPages[Number(pngIndex)];

      svgToPng(page);
    }
  }
);

elements.allBtn.addEventListener(
  'click',
  () => {
    currentPages.forEach(
      (page, index) => {
        setTimeout(
          () => {
            download(
              svgBlob(page.svg),
              `${String(index + 1).padStart(
                2,
                '0'
              )}-${slug(page.name)}.svg`
            );
          },
          index * 120
        );
      }
    );
  }
);

[
  elements.font,
  elements.perPage,
  elements.cols,
  elements.allDesc
]
  .filter(Boolean)
  .forEach(element => {
    element.addEventListener(
      'change',
      () => {
        if (currentPages.length) {
          render();
        }
      }
    );
  });

syncColor(
  elements.primary,
  elements.primaryHex
);

syncColor(
  elements.accent1,
  elements.accent1Hex
);

syncColor(
  elements.accent2,
  elements.accent2Hex
);

syncColor(
  elements.bg,
  elements.backgroundHex
);

elements.input.value = EXAMPLE;

updateHexFields();
render();
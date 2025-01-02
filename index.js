"use strict";
const { ReportBase } = require("istanbul-lib-report");

const STATUS_COL = 2;
const NAME_COL = 4;
const PCT_COLS = 7;
const MISSING_COL = 17;
const TAB_SIZE = 2;
const DELIM = " | ";

const RED_STATUS = "🔴";
const YELLOW_STATUS = "🟡";
const GREEN_STATUS = "🟢";

function getStatus(statementsCovered) {
    if (statementsCovered < 50) {
        return RED_STATUS;
    } else if (statementsCovered > 80) {
        return GREEN_STATUS;
    } else {
        return YELLOW_STATUS;
    }
}

function padding(num, ch) {
    let str = "";
    let i;
    ch = ch || " ";
    for (i = 0; i < num; i += 1) {
        str += ch;
    }
    return str;
}

function fill(str, width, right, tabs) {
    tabs = tabs || 0;
    str = String(str);

    const leadingSpaces = tabs * TAB_SIZE;
    const remaining = width - leadingSpaces;

    // Use &nbsp; to properly render nesting in Markdown viewers
    const leader = padding(leadingSpaces, "&nbsp;");
    let fmtStr = "";

    if (remaining > 0) {
        const strlen = str.length;
        let fillStr;

        if (remaining >= strlen) {
            fillStr = padding(remaining - strlen);
        } else {
            fillStr = "...";
            const length = remaining - fillStr.length;

            str = str.substring(strlen - length);
            right = true;
        }
        fmtStr = right ? fillStr + str : str + fillStr;
    }

    return leader + fmtStr;
}

function formatName(name, maxCols, level) {
    return fill(name, maxCols, false, level);
}

function formatPct(pct, width) {
    return fill(pct, width || PCT_COLS, true, 0);
}

function nodeMissing(node) {
    if (node.isSummary()) {
        return "";
    }

    const metrics = node.getCoverageSummary();
    const isEmpty = metrics.isEmpty();
    const lines = isEmpty ? 0 : metrics.lines.pct;

    let coveredLines;

    const fileCoverage = node.getFileCoverage();
    if (lines === 100) {
        const branches = fileCoverage.getBranchCoverageByLine();
        coveredLines = Object.entries(branches).map(([key, { coverage }]) => [
            key,
            coverage === 100,
        ]);
    } else {
        coveredLines = Object.entries(fileCoverage.getLineCoverage());
    }

    let newRange = true;
    const ranges = coveredLines
        .reduce((acum, [line, hit]) => {
            if (hit) newRange = true;
            else {
                line = parseInt(line);
                if (newRange) {
                    acum.push([line]);
                    newRange = false;
                } else acum[acum.length - 1][1] = line;
            }

            return acum;
        }, [])
        .map((range) => {
            const { length } = range;

            if (length === 1) return range[0];

            return `${range[0]}-${range[1]}`;
        });

    return [].concat(...ranges).join(",");
}

function nodeName(node) {
    return node.getRelativeName() || "All files";
}

function depthFor(node) {
    let ret = 0;
    node = node.getParent();
    while (node) {
        ret += 1;
        node = node.getParent();
    }
    return ret;
}

function nullDepthFor() {
    return 0;
}

function findWidth(node, context, nodeExtractor, depthFor = nullDepthFor) {
    let last = 0;
    function compareWidth(node) {
        last = Math.max(
            last,
            TAB_SIZE * depthFor(node) + nodeExtractor(node).length,
        );
    }
    const visitor = {
        onSummary: compareWidth,
        onDetail: compareWidth,
    };
    node.visit(context.getVisitor(visitor));
    return last;
}

function makeLine(nameWidth, missingWidth) {
    const status = padding(STATUS_COL, "-");
    const name = padding(nameWidth, "-");
    const pct = padding(PCT_COLS, "-");
    const elements = [];

    elements.push(status);
    elements.push(name);
    elements.push(pct);
    elements.push(padding(PCT_COLS + 1, "-"));
    elements.push(pct);
    elements.push(pct);
    elements.push(padding(missingWidth, "-"));
    return elements.join(DELIM.replace(/ /g, "-")) + "-";
}

function tableHeader(maxNameCols, missingWidth) {
    const elements = [];
    elements.push(formatName("St", STATUS_COL));
    elements.push(formatName("File", maxNameCols, 0));
    elements.push(formatPct("% Stmts"));
    elements.push(formatPct("% Branch", PCT_COLS + 1));
    elements.push(formatPct("% Funcs"));
    elements.push(formatPct("% Lines"));
    elements.push(formatName("Uncovered Line #s", missingWidth));
    return elements.join(DELIM) + " ";
}

function isFull(metrics) {
    return (
        metrics.statements.pct === 100 &&
        metrics.branches.pct === 100 &&
        metrics.functions.pct === 100 &&
        metrics.lines.pct === 100
    );
}

function colorizerMarkdown(str, colorClass, shouldColorize) {
    if (!colorClass || !shouldColorize) return str; // Return uncolored if no class is provided or colorizing is disabled
    return `<span style="color: ${colorClass};">${str}</span>`;
}

function tableRow(
    node,
    maxNameCols,
    level,
    skipEmpty,
    skipFull,
    missingWidth,
    shouldColorize,
) {
    const name = nodeName(node);
    const metrics = node.getCoverageSummary();
    const isEmpty = metrics.isEmpty();
    if (skipEmpty && isEmpty) {
        return "";
    }
    if (skipFull && isFull(metrics)) {
        return "";
    }

    const mm = {
        statements: isEmpty ? 0 : metrics.statements.pct,
        branches: isEmpty ? 0 : metrics.branches.pct,
        functions: isEmpty ? 0 : metrics.functions.pct,
        lines: isEmpty ? 0 : metrics.lines.pct,
    };

    const getColor = (pct) => {
        if (pct === 0) return "red";
        if (pct < 50) return "orange";
        if (pct < 80) return "yellow";
        return "green";
    };

    const elements = [
        colorizerMarkdown(getStatus(mm.statements), getColor(mm.statements), shouldColorize),
        formatName(name, maxNameCols, level),
        colorizerMarkdown(formatPct(mm.statements), getColor(mm.statements), shouldColorize),
        colorizerMarkdown(formatPct(mm.branches, PCT_COLS + 1), getColor(mm.branches), shouldColorize),
        colorizerMarkdown(formatPct(mm.functions), getColor(mm.functions), shouldColorize),
        colorizerMarkdown(formatPct(mm.lines), getColor(mm.lines), shouldColorize),
        colorizerMarkdown(
            formatName(nodeMissing(node), missingWidth),
            mm.lines === 100 ? "gray" : "red",
            shouldColorize
        )
    ];

    return elements.join(DELIM) + " ";
}

class MarkdownReport extends ReportBase {
    constructor(opts) {
        super(opts);

        opts = opts || {};
        const { maxCols } = opts;

        this.file = opts.file || "coverage.md";
        this.color = opts.color ?? true;
        this.maxCols = maxCols != null ? maxCols : process.stdout.columns || 80;
        this.cw = null;
        this.skipEmpty = opts.skipEmpty;
        this.skipFull = opts.skipFull;
    }

    onStart(root, context) {
        this.cw = context.writer.writeFile(this.file);
        this.nameWidth = Math.max(
            NAME_COL,
            findWidth(root, context, nodeName, depthFor),
        );
        this.missingWidth = Math.max(
            MISSING_COL,
            findWidth(root, context, nodeMissing),
        );

        if (this.maxCols > 0) {
            const pct_cols = DELIM.length + 4 * (PCT_COLS + DELIM.length) + 2;

            const maxRemaining = this.maxCols - (pct_cols + MISSING_COL);
            if (this.nameWidth > maxRemaining) {
                this.nameWidth = maxRemaining;
                this.missingWidth = MISSING_COL;
            } else if (this.nameWidth < maxRemaining) {
                const maxRemaining = this.maxCols - (this.nameWidth + pct_cols);
                if (this.missingWidth > maxRemaining) {
                    this.missingWidth = maxRemaining;
                }
            }
        }

        this.cw.println("# Coverage report");
        this.cw.println("");
        this.cw.println(tableHeader(this.nameWidth, this.missingWidth));
        this.cw.println(makeLine(this.nameWidth, this.missingWidth));
    }

    onSummary(node) {
        const nodeDepth = depthFor(node);
        const row = tableRow(
            node,
            this.nameWidth,
            nodeDepth,
            this.skipEmpty,
            this.skipFull,
            this.missingWidth,
            this.color,
        );
        if (row) {
            this.cw.println(row);
        }
    }

    onDetail(node, context) {
        return this.onSummary(node, context);
    }

    onEnd() {
        this.cw.close();
    }
}

module.exports = MarkdownReport;

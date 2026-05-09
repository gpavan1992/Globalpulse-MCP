import { ResponseFormat } from "../constants.js";
export function formatOutput(data, markdownFn, format) {
    return format === ResponseFormat.JSON ? JSON.stringify(data, null, 2) : markdownFn();
}
export function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined)
        return "N/A";
    if (Math.abs(value) >= 1e12)
        return `${(value / 1e12).toFixed(decimals)}T`;
    if (Math.abs(value) >= 1e9)
        return `${(value / 1e9).toFixed(decimals)}B`;
    if (Math.abs(value) >= 1e6)
        return `${(value / 1e6).toFixed(decimals)}M`;
    if (Math.abs(value) >= 1e3)
        return `${(value / 1e3).toFixed(decimals)}K`;
    return value.toFixed(decimals);
}
export function formatDate(isoString) {
    try {
        return new Date(isoString).toUTCString().replace(" GMT", " UTC");
    }
    catch {
        return isoString;
    }
}
export function markdownTable(headers, rows) {
    const headerRow = `| ${headers.join(" | ")} |`;
    const divider = `| ${headers.map(() => "---").join(" | ")} |`;
    const dataRows = rows.map((row) => `| ${row.join(" | ")} |`);
    return [headerRow, divider, ...dataRows].join("\n");
}

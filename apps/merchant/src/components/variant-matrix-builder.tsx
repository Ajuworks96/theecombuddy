"use client";

import React, { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, XIcon } from "./icons";

export interface OptionGroup {
  id: string;
  title: string;
  values: string[];
}

export interface VariantPrice {
  currency_code: string;
  amount: number;
}

export interface MatrixVariant {
  id?: string;
  title: string;
  sku: string;
  options: Record<string, string>;
  prices: VariantPrice[];
  stock: number;
}

interface VariantMatrixBuilderProps {
  handle: string;
  initialOptions?: OptionGroup[];
  initialVariants?: MatrixVariant[];
  onChange: (options: OptionGroup[], variants: MatrixVariant[]) => void;
}

const SUPPORTED_CURRENCIES = [
  { code: "inr", symbol: "₹", label: "INR (Base)" },
  { code: "usd", symbol: "$", label: "USD" },
  { code: "aed", symbol: "AED", label: "AED" },
  { code: "gbp", symbol: "£", label: "GBP" },
  { code: "eur", symbol: "€", label: "EUR" },
];

export function VariantMatrixBuilder({
  handle,
  initialOptions = [],
  initialVariants = [],
  onChange,
}: VariantMatrixBuilderProps) {
  const [hasVariants, setHasVariants] = useState<boolean>(
    initialOptions.length > 0 && initialOptions.some((o) => o.values.length > 0)
  );

  const [options, setOptions] = useState<OptionGroup[]>(
    initialOptions.length > 0
      ? initialOptions
      : [{ id: "opt_1", title: "Size", values: [] }]
  );

  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({});

  // Single default variant state when hasVariants is false
  const [singleVariant, setSingleVariant] = useState<MatrixVariant>(
    initialVariants.length > 0
      ? initialVariants[0]
      : {
          title: "Default Variant",
          sku: handle ? `${handle.toUpperCase()}-DEF` : "PROD-DEF",
          options: {},
          prices: [{ currency_code: "inr", amount: 0 }],
          stock: 100,
        }
  );

  const [matrixVariants, setMatrixVariants] = useState<MatrixVariant[]>(
    initialVariants.length > 0 ? initialVariants : []
  );

  // Helper to get price amount for a variant and currency
  const getPrice = (variant: MatrixVariant, currencyCode: string): number | string => {
    const p = variant.prices?.find(
      (pr) => pr.currency_code.toLowerCase() === currencyCode.toLowerCase()
    );
    return p !== undefined && p.amount !== null ? p.amount : "";
  };

  // Helper to set price on variant
  const updateVariantPrice = (
    variantIndex: number,
    currencyCode: string,
    valStr: string
  ) => {
    const val = valStr === "" ? 0 : Math.max(0, parseFloat(valStr) || 0);
    const updated = [...matrixVariants];
    const variant = { ...updated[variantIndex] };
    const prices = [...(variant.prices || [])];

    const idx = prices.findIndex(
      (p) => p.currency_code.toLowerCase() === currencyCode.toLowerCase()
    );
    if (idx >= 0) {
      prices[idx] = { ...prices[idx], amount: val };
    } else {
      prices.push({ currency_code: currencyCode.toLowerCase(), amount: val });
    }

    variant.prices = prices;
    updated[variantIndex] = variant;
    setMatrixVariants(updated);
  };

  const updateSingleVariantPrice = (currencyCode: string, valStr: string) => {
    const val = valStr === "" ? 0 : Math.max(0, parseFloat(valStr) || 0);
    const prices = [...(singleVariant.prices || [])];
    const idx = prices.findIndex(
      (p) => p.currency_code.toLowerCase() === currencyCode.toLowerCase()
    );
    if (idx >= 0) {
      prices[idx] = { ...prices[idx], amount: val };
    } else {
      prices.push({ currency_code: currencyCode.toLowerCase(), amount: val });
    }
    const updated = { ...singleVariant, prices };
    setSingleVariant(updated);
    onChange([], [updated]);
  };

  // Generate Cartesian product of options
  const generateMatrix = (currentOptions: OptionGroup[]) => {
    const activeOptions = currentOptions.filter(
      (o) => o.title.trim() && o.values.length > 0
    );

    if (activeOptions.length === 0) {
      return [];
    }

    const cartesian = (arrays: string[][]): string[][] => {
      return arrays.reduce<string[][]>(
        (a, b) => a.flatMap((d) => b.map((e) => [...d, e])),
        [[]]
      );
    };

    const valueArrays = activeOptions.map((o) => o.values);
    const combinations = cartesian(valueArrays);

    const baseSkuPrefix = (handle || "PROD").toUpperCase().replace(/[^A-Z0-9]/g, "-");

    const newVariants: MatrixVariant[] = combinations.map((combo) => {
      const optionMap: Record<string, string> = {};
      combo.forEach((val, i) => {
        optionMap[activeOptions[i].title] = val;
      });

      const title = combo.join(" / ");
      const skuSuffix = combo
        .map((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
        .join("-");
      const sku = `${baseSkuPrefix}-${skuSuffix}`;

      // Check if existing variant matches to preserve custom prices/SKUs
      const existing = matrixVariants.find((mv) => {
        return Object.entries(optionMap).every(
          ([k, v]) => mv.options && mv.options[k] === v
        );
      });

      if (existing) {
        return {
          ...existing,
          title,
          options: optionMap,
        };
      }

      return {
        title,
        sku,
        options: optionMap,
        prices: [{ currency_code: "inr", amount: 0 }],
        stock: 50,
      };
    });

    return newVariants;
  };

  // Add Option Group
  const addOptionGroup = () => {
    const nextNum = options.length + 1;
    const newGroup: OptionGroup = {
      id: `opt_${Date.now()}_${nextNum}`,
      title: nextNum === 2 ? "Color" : nextNum === 3 ? "Material" : `Option ${nextNum}`,
      values: [],
    };
    setOptions([...options, newGroup]);
  };

  // Remove Option Group
  const removeOptionGroup = (id: string) => {
    const updated = options.filter((o) => o.id !== id);
    setOptions(updated);
    const newVars = generateMatrix(updated);
    setMatrixVariants(newVars);
    onChange(updated, newVars);
  };

  // Add Option Value Pill
  const addOptionValue = (groupId: string) => {
    const rawVal = newValueInputs[groupId]?.trim();
    if (!rawVal) return;

    const updatedOptions = options.map((opt) => {
      if (opt.id === groupId) {
        if (!opt.values.includes(rawVal)) {
          return { ...opt, values: [...opt.values, rawVal] };
        }
      }
      return opt;
    });

    setOptions(updatedOptions);
    setNewValueInputs({ ...newValueInputs, [groupId]: "" });
    const newVars = generateMatrix(updatedOptions);
    setMatrixVariants(newVars);
    onChange(updatedOptions, newVars);
  };

  // Remove Option Value Pill
  const removeOptionValue = (groupId: string, valToRemove: string) => {
    const updatedOptions = options.map((opt) => {
      if (opt.id === groupId) {
        return { ...opt, values: opt.values.filter((v) => v !== valToRemove) };
      }
      return opt;
    });

    setOptions(updatedOptions);
    const newVars = generateMatrix(updatedOptions);
    setMatrixVariants(newVars);
    onChange(updatedOptions, newVars);
  };

  // Sync state upward when matrixVariants change
  useEffect(() => {
    if (hasVariants) {
      const activeOptions = options.filter(
        (o) => o.title.trim() && o.values.length > 0
      );
      onChange(activeOptions, matrixVariants);
    } else {
      onChange([], [singleVariant]);
    }
  }, [hasVariants, matrixVariants, singleVariant]);

  return (
    <div className="space-y-6">
      {/* Switch between Simple and Variant Product */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            Variants & Multi-Currency Pricing
          </h4>
          <p className="text-xs text-slate-500">
            Configure different sizes, colors, international currency prices, and SKU inventory
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={hasVariants}
            onChange={(e) => {
              const enabled = e.target.checked;
              setHasVariants(enabled);
              if (enabled && options[0].values.length === 0) {
                // Pre-populate with default Size options
                const sampleOpts = [
                  { id: "opt_1", title: "Size", values: ["S", "M", "L"] },
                ];
                setOptions(sampleOpts);
                const generated = generateMatrix(sampleOpts);
                setMatrixVariants(generated);
              }
            }}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          <span className="ml-3 text-xs font-medium text-slate-700">
            Has multiple variants
          </span>
        </label>
      </div>

      {!hasVariants ? (
        /* Simple Product Price & Stock Form */
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SKU (Stock Keeping Unit)
              </label>
              <input
                type="text"
                value={singleVariant.sku}
                onChange={(e) => {
                  const updated = { ...singleVariant, sku: e.target.value.trim() };
                  setSingleVariant(updated);
                  onChange([], [updated]);
                }}
                placeholder="e.g. TSHIRT-BLACK-01"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                value={singleVariant.stock}
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value) || 0);
                  const updated = { ...singleVariant, stock: val };
                  setSingleVariant(updated);
                  onChange([], [updated]);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Currency Pricing
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {SUPPORTED_CURRENCIES.map((curr) => (
                <div key={curr.code} className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="block text-[11px] font-medium text-slate-500 mb-1">
                    {curr.label}
                  </span>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-slate-400 font-medium pointer-events-none">
                      {curr.symbol}
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={getPrice(singleVariant, curr.code)}
                      onChange={(e) => updateSingleVariantPrice(curr.code, e.target.value)}
                      placeholder="0"
                      className="w-full pl-7 pr-2 py-1.5 text-sm bg-transparent border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Multi-Variant Matrix Builder */
        <div className="space-y-6">
          {/* Option Groups */}
          <div className="space-y-4">
            {options.map((opt, optIndex) => (
              <div
                key={opt.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                      {optIndex + 1}
                    </span>
                    <input
                      type="text"
                      value={opt.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        const updated = options.map((o) =>
                          o.id === opt.id ? { ...o, title: newTitle } : o
                        );
                        setOptions(updated);
                      }}
                      className="text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-md px-2.5 py-1 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      placeholder="Option Name (e.g. Size)"
                    />
                  </div>
                  {options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOptionGroup(opt.id)}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="Remove option group"
                    >
                      <TrashIcon size={16} />
                    </button>
                  )}
                </div>

                {/* Value Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {opt.values.map((val) => (
                    <span
                      key={val}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 text-slate-800 rounded-lg text-xs font-medium shadow-xs"
                    >
                      {val}
                      <button
                        type="button"
                        onClick={() => removeOptionValue(opt.id, val)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <XIcon size={12} />
                      </button>
                    </span>
                  ))}

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newValueInputs[opt.id] || ""}
                      onChange={(e) =>
                        setNewValueInputs({
                          ...newValueInputs,
                          [opt.id]: e.target.value,
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addOptionValue(opt.id);
                        }
                      }}
                      placeholder="Type & press Enter..."
                      className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => addOptionValue(opt.id)}
                      className="px-2.5 py-1 text-xs font-medium bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addOptionGroup}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              <PlusIcon size={14} /> Add another option (Color, Material...)
            </button>
          </div>

          {/* Generated Matrix Table */}
          {matrixVariants.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Variant Combinations ({matrixVariants.length})
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    Define unique SKUs and specific multi-currency prices for each variant
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50/75 text-slate-600 font-medium">
                    <tr>
                      <th className="px-3 py-2.5">Variant</th>
                      <th className="px-3 py-2.5 min-w-[140px]">SKU</th>
                      <th className="px-3 py-2.5 min-w-[90px]">INR (₹)*</th>
                      <th className="px-3 py-2.5 min-w-[85px]">USD ($)</th>
                      <th className="px-3 py-2.5 min-w-[85px]">AED</th>
                      <th className="px-3 py-2.5 min-w-[85px]">GBP (£)</th>
                      <th className="px-3 py-2.5 min-w-[85px]">EUR (€)</th>
                      <th className="px-3 py-2.5 min-w-[80px]">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {matrixVariants.map((mv, vIdx) => (
                      <tr key={mv.sku || vIdx} className="hover:bg-slate-50/60">
                        <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">
                          {mv.title}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={mv.sku}
                            onChange={(e) => {
                              const updated = [...matrixVariants];
                              updated[vIdx] = {
                                ...updated[vIdx],
                                sku: e.target.value.trim(),
                              };
                              setMatrixVariants(updated);
                            }}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={getPrice(mv, "inr")}
                            onChange={(e) =>
                              updateVariantPrice(vIdx, "inr", e.target.value)
                            }
                            placeholder="0"
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={getPrice(mv, "usd")}
                            onChange={(e) =>
                              updateVariantPrice(vIdx, "usd", e.target.value)
                            }
                            placeholder="0"
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={getPrice(mv, "aed")}
                            onChange={(e) =>
                              updateVariantPrice(vIdx, "aed", e.target.value)
                            }
                            placeholder="0"
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={getPrice(mv, "gbp")}
                            onChange={(e) =>
                              updateVariantPrice(vIdx, "gbp", e.target.value)
                            }
                            placeholder="0"
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={getPrice(mv, "eur")}
                            onChange={(e) =>
                              updateVariantPrice(vIdx, "eur", e.target.value)
                            }
                            placeholder="0"
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={mv.stock ?? 50}
                            onChange={(e) => {
                              const updated = [...matrixVariants];
                              updated[vIdx] = {
                                ...updated[vIdx],
                                stock: Math.max(0, parseInt(e.target.value) || 0),
                              };
                              setMatrixVariants(updated);
                            }}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

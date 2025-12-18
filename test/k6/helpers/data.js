import { SharedArray } from "k6/data";

export const datasets = new SharedArray("checkout datasets", () => {
  return JSON.parse(open("../data/checkout-datasets.json"));
});

export function pickDataset(iter) {
  return datasets[iter % datasets.length];
}

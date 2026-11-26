/** Metro bundles font files as assets; importing one gives the asset ID expo-font loads. */
declare module "*.ttf" {
  const asset: number;
  export default asset;
}

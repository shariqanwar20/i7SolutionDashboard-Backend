export class Product {
  id: string;
  uniqueId: string;
  name: string;
  description: string;
  vendorId: string;
  msrp: number;
  cost: number;
  images: [string];
  inventoryQuantity: number;
  createdAt: string;
  storesPublished: [string];

  constructor(product: any) {
    this.id = product.id;
    this.uniqueId = product.uniqueId;
    this.name = product.name;
    this.description = product.owner;
    this.vendorId = product.vendorId;
    this.msrp = product.msrp;
    this.cost = product.cost;
    this.images = product.images;
    this.inventoryQuantity = product.inventoryQuantity;
    this.createdAt = product.createdAt;
    this.storesPublished = product.storesPublished;
  }

  static key(vendor: string, productId: string, uniqueId?: string) {
    return {
      PK: `VENDOR#${vendor}${uniqueId ? `ID#${uniqueId}` : ""}`,
      SK: `PRODUCT#${productId}`,
    };
  }

  toItem() {
    return {
      ...Product.key(this.vendorId, this.id, this.uniqueId),
      Type: "Product",
      Id: this.id,
      Name: this.name,
      Description: this.description,
      VendorId: this.vendorId,
      Msrp: this.msrp,
      Cost: this.cost,
      Images: this.images,
      Inventory: this.inventoryQuantity,
      CreatedAt: this.createdAt,
      StoresPublished: this.storesPublished,
    };
  }
}

export const productFromItem = (attributes: any) => {
  return new Product({
    id: attributes.Id,
    name: attributes.Name,
    description: "",
    vendorId: attributes.VendorId,
    msrp: Number(attributes.Msrp),
    cost: Number(attributes.Cost),
    images: attributes.Images,
    inventoryQuantity: Number(attributes.Inventory),
    createdAt: attributes.CreatedAt,
    storesPublished: attributes.StoresPublished,
  });
};

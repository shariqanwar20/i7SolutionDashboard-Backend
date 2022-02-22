export class Site {
    id: string;
    owner: string;
    name: string;
    url: string;
  
    constructor(site: any) {
      this.id = site.id;
      this.name = site.name;
      this.owner = site.owner;
      this.url = site.url;
    }
  
    static key(owner: string, siteId: string) {
      return {
        PK: `USER#${owner}`,
        SK: `SITE#${siteId}`,
      };
    }
  
    toItem() {
      return {
        ...Site.key(this.owner, this.id),
        Type: "Site",
        Owner: this.owner,
        Name: this.name,
        Url: this.url
      };
    }
  }
  
  export const siteFromItem = (attributes: any) => {
    return new Site({
      id: attributes.id,
      name: attributes.name,
      owner: attributes.owner,
      url: attributes.url
    });
  };
  
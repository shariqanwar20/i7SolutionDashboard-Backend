export class User {
  id: string;
  name: string;
  email: string;

  constructor(user: any) {
    this.id = user.id;
    this.name = user.name;
    this.email = user.email;
  }

  static key(id: string, email: string) {
    return {
      SK: `USEREMAIL#${email}`,
      PK: `USER#${id}`,
    };
  }

  toItem() {
    return {
      ...User.key(this.id, this.email),
      Type: "User",
      Name: this.name,
      Email: this.email,
    };
  }
}

export const userFromItem = (attributes: any) => {
  return new User({
    id: attributes.id,
    name: attributes.name,
    email: attributes.email,
  });
};

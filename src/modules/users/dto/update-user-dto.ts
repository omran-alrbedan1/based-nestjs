export class UpdateUserDto {
  id!: string;
  email!: string;
  firstName!: string | null;
  lastName!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

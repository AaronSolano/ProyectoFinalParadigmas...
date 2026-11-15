import { Column, CreateDateColumn, DataSource, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DomainError, Profiles, StoredProfile } from '../domain/profile';
@Entity('profiles')
export class ProfileEntity implements StoredProfile {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({type:'citext', unique:true}) email!: string;
  @Column({name:'display_name', type:'varchar', length:40}) displayName!: string;
  @Column({name:'password_hash', type:'text'}) passwordHash!: string;
  @CreateDateColumn({name:'created_at', type:'timestamptz'}) createdAt!: Date;
}
export class PostgresProfiles implements Profiles {
  constructor(private readonly db: DataSource) {}
  findByEmail(email: string) { return this.db.getRepository(ProfileEntity).findOneBy({email}); }
  findById(id: string) { return this.db.getRepository(ProfileEntity).findOneBy({id}); }
  async create(email: string, displayName: string, passwordHash: string) {
    try { return await this.db.getRepository(ProfileEntity).save({email, displayName, passwordHash}); }
    catch (error) {
      if ((error as {driverError?: {code?:string}}).driverError?.code === '23505') throw new DomainError('EMAIL_TAKEN', 'Ya existe un perfil registrado con ese correo.');
      throw error;
    }
  }
}

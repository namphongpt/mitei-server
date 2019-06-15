import { Column, Entity, PrimaryColumn } from 'typeorm';
import { SessionEntity } from 'typeorm-store';

@Entity()
export class Session implements SessionEntity {
  @PrimaryColumn('varchar', { length: 64 })
  id = '';

  @Column('int')
  expiresAt = 0;

  @Column('text')
  data = '';
}

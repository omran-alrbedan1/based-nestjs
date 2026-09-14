import { validate } from 'class-validator';
import { OptionListQueryDto } from './maintenance-card-option.dto';

describe('OptionListQueryDto', () => {
  it('accepts isActive=true as boolean true', async () => {
    const dto = Object.assign(new OptionListQueryDto(), { isActive: true });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.isActive).toBe(true);
  });

  it('accepts isActive=false as boolean false', async () => {
    const dto = Object.assign(new OptionListQueryDto(), { isActive: false });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.isActive).toBe(false);
  });

  it('accepts missing isActive', async () => {
    const dto = Object.assign(new OptionListQueryDto(), {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.isActive).toBeUndefined();
  });

  it('rejects isActive=garbage', async () => {
    const dto = Object.assign(new OptionListQueryDto(), { isActive: 'garbage' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('isActive');
  });
});

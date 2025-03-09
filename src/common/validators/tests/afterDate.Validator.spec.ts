import 'reflect-metadata';
import { validate } from 'class-validator';
import { IsAfterDate } from '../is-after-date.validator';
import { Type } from 'class-transformer';
class TestClass {
  @Type(() => Date)
  startDate: Date;
  @IsAfterDate('startDate', { message: 'End date must be after start date' })
  @Type(() => Date)
  endDate: Date;
}
describe('IsAfterDate', () => {
  it('should pass validation if endDate is after startDate', async () => {
    const testInstance = new TestClass();
    testInstance.startDate = new Date('2025-01-01');
    testInstance.endDate = new Date('2025-01-02');
    const errors = await validate(testInstance);
    expect(errors.length).toBe(0);
  });
  it('should fail validation if endDate is before startDate', async () => {
    const testInstance = new TestClass();
    testInstance.startDate = new Date('2025-01-02');
    testInstance.endDate = new Date('2025-01-01');
    const errors = await validate(testInstance);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints?.isAfterDate).toBe('End date must be after start date');
  });
  it('should fail validation if endDate is equal to startDate', async () => {
    const testInstance = new TestClass();
    testInstance.startDate = new Date('2025-01-01');
    testInstance.endDate = new Date('2025-01-01');
    const errors = await validate(testInstance);
    expect(errors.length).toBe(1);
    expect(errors[0].constraints?.isAfterDate).toBe('End date must be after start date');
  });
});

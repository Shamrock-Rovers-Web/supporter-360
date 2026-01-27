import { ScheduledHandler } from 'aws-lambda';
import { SupporterTypeService } from '../../services/supporter-type.service';

const typeService = new SupporterTypeService();

export const handler: ScheduledHandler = async (event) => {
  console.log('Supporter type derivation triggered', JSON.stringify(event));

  try {
    const result = await typeService.deriveAll();
    console.log(`Derived types for ${result.updated} supporters`);
  } catch (error) {
    console.error('Supporter type derivation error:', error);
    throw error;
  }
};

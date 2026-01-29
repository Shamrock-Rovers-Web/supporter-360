import { ScheduledHandler } from 'aws-lambda';
import { ReconcilerService } from '../../services/reconciler.service';

const reconciler = new ReconcilerService();

export const handler: ScheduledHandler = async (event) => {
  console.log('Reconciliation triggered', JSON.stringify(event));

  try {
    const results = await reconciler.reconcileAll();
    console.log('Reconciliation complete', results);
  } catch (error) {
    console.error('Reconciliation error:', error);
    throw error;
  }
};

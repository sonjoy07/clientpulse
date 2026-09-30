import {
  AllocationStatus,
  ProjectCapacityStatus,
  calculateAllocationStatus,
  calculateProjectCapacityStatus,
  ResourceAllocationCalculator,
} from './resources.types.js';

describe('Resource Capacity Calculations & Policies', () => {
  describe('calculateAllocationStatus', () => {
    it('should classify < 90% as AVAILABLE', () => {
      expect(calculateAllocationStatus(0)).toBe(AllocationStatus.AVAILABLE);
      expect(calculateAllocationStatus(50)).toBe(AllocationStatus.AVAILABLE);
      expect(calculateAllocationStatus(89.9)).toBe(AllocationStatus.AVAILABLE);
    });

    it('should classify 90% - 100% as FULL', () => {
      expect(calculateAllocationStatus(90)).toBe(AllocationStatus.FULL);
      expect(calculateAllocationStatus(95)).toBe(AllocationStatus.FULL);
      expect(calculateAllocationStatus(100)).toBe(AllocationStatus.FULL);
    });

    it('should classify > 100% as OVERALLOCATED', () => {
      expect(calculateAllocationStatus(100.1)).toBe(
        AllocationStatus.OVERALLOCATED,
      );
      expect(calculateAllocationStatus(150)).toBe(
        AllocationStatus.OVERALLOCATED,
      );
    });
  });

  describe('calculateProjectCapacityStatus', () => {
    it('should classify < 50% as UNDERSTAFFED', () => {
      expect(calculateProjectCapacityStatus(0)).toBe(
        ProjectCapacityStatus.UNDERSTAFFED,
      );
      expect(calculateProjectCapacityStatus(49.9)).toBe(
        ProjectCapacityStatus.UNDERSTAFFED,
      );
    });

    it('should classify 50% - 90% as BALANCED', () => {
      expect(calculateProjectCapacityStatus(50)).toBe(
        ProjectCapacityStatus.BALANCED,
      );
      expect(calculateProjectCapacityStatus(75)).toBe(
        ProjectCapacityStatus.BALANCED,
      );
      expect(calculateProjectCapacityStatus(90)).toBe(
        ProjectCapacityStatus.BALANCED,
      );
    });

    it('should classify > 90% as HIGH_UTILIZATION', () => {
      expect(calculateProjectCapacityStatus(90.1)).toBe(
        ProjectCapacityStatus.HIGH_UTILIZATION,
      );
      expect(calculateProjectCapacityStatus(120)).toBe(
        ProjectCapacityStatus.HIGH_UTILIZATION,
      );
    });
  });

  describe('ResourceAllocationCalculator', () => {
    it('should calculate total allocation accurately', () => {
      expect(
        ResourceAllocationCalculator.calculateTotalAllocation([30, 40, 30]),
      ).toBe(100);
      expect(ResourceAllocationCalculator.calculateTotalAllocation([])).toBe(0);
      expect(
        ResourceAllocationCalculator.calculateTotalAllocation([50, 60]),
      ).toBe(110);
    });

    it('should calculate available capacity and never go below 0', () => {
      expect(ResourceAllocationCalculator.calculateAvailableCapacity(60)).toBe(
        40,
      );
      expect(ResourceAllocationCalculator.calculateAvailableCapacity(100)).toBe(
        0,
      );
      expect(ResourceAllocationCalculator.calculateAvailableCapacity(130)).toBe(
        0,
      );
    });

    it('should calculate overallocatedBy correctly', () => {
      expect(ResourceAllocationCalculator.calculateOverallocatedBy(80)).toBe(0);
      expect(ResourceAllocationCalculator.calculateOverallocatedBy(100)).toBe(
        0,
      );
      expect(ResourceAllocationCalculator.calculateOverallocatedBy(125)).toBe(
        25,
      );
    });

    it('should delegate getResourceStatus and calculateProjectCapacityStatus', () => {
      expect(ResourceAllocationCalculator.getResourceStatus(70)).toBe(
        AllocationStatus.AVAILABLE,
      );
      expect(
        ResourceAllocationCalculator.calculateProjectCapacityStatus(60),
      ).toBe(ProjectCapacityStatus.BALANCED);
    });

    it('should verify Section 37 scenario: John across Project A and B lifecycle', () => {
      // Scenario Step 1: Project A: 80%, Project B: 40%
      let allocations = [80, 40];
      let total =
        ResourceAllocationCalculator.calculateTotalAllocation(allocations);
      let available =
        ResourceAllocationCalculator.calculateAvailableCapacity(total);
      let overallocated =
        ResourceAllocationCalculator.calculateOverallocatedBy(total);
      let status = ResourceAllocationCalculator.getResourceStatus(total);

      expect(total).toBe(120);
      expect(available).toBe(0);
      expect(overallocated).toBe(20);
      expect(status).toBe(AllocationStatus.OVERALLOCATED);

      // Scenario Step 2: Change Project A: 80% -> 40%
      allocations = [40, 40];
      total =
        ResourceAllocationCalculator.calculateTotalAllocation(allocations);
      available =
        ResourceAllocationCalculator.calculateAvailableCapacity(total);
      overallocated =
        ResourceAllocationCalculator.calculateOverallocatedBy(total);
      status = ResourceAllocationCalculator.getResourceStatus(total);

      expect(total).toBe(80);
      expect(available).toBe(20);
      expect(overallocated).toBe(0);
      expect(status).toBe(AllocationStatus.AVAILABLE);

      // Scenario Step 3: Remove Project B (remaining: 40%)
      allocations = [40];
      total =
        ResourceAllocationCalculator.calculateTotalAllocation(allocations);
      available =
        ResourceAllocationCalculator.calculateAvailableCapacity(total);
      overallocated =
        ResourceAllocationCalculator.calculateOverallocatedBy(total);
      status = ResourceAllocationCalculator.getResourceStatus(total);

      expect(total).toBe(40);
      expect(available).toBe(60);
      expect(overallocated).toBe(0);
      expect(status).toBe(AllocationStatus.AVAILABLE);
    });
  });
});

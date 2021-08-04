import {
    OperationType,
    GameInterestMiningConfig,
    RefinedExtractionConfig,
    AreaType as AreaTypeEnum,
    TaskFormConfigType,
    BaseFormType,
    CategoryExtractionMining,
    AccurateModelingMining,
    KnowledgeGraphMining,
    RefinedExtractionTask
} from '@/components/create-mining-task/task-form-config';
import GameInterestMining from '@/components/create-mining-task/game-interest-mining/index';
import LabelSystemMining from '@/components/create-mining-task/label-system-mining/index';
import PanEntertainmentMining from '@/components/create-mining-task/pan-entertainment-mining/index';
import CategoryExtraction from '@/components/create-mining-task/category-extraction/index';
import AccurateModeling from '@/components/create-mining-task/accurate-modeling/index';
import KnowledgeGraph from '@/components/create-mining-task/knowledge-graph/index';
import UploadNumberPackage from '@/components/create-mining-task/upload-number-package/index';
import { saveJob } from '@/dao/user-mining/api/save-job';
import { commitMany } from '@/dao/user-mining/api/commit-job';
import { getJobDetail, GetJobDetailData } from '@/dao/user-mining/api/get-job-detail';
import { JobDetailResData } from '@/model/user-mining/job-detail';
import dayjs from 'dayjs';
import { ElMessage } from 'element-plus';
import { UserMiningPromise } from '@/dao/user-mining/type';

import Vrouter from '@/router';

const SocialDiffusion = AccurateModeling;
const router = Vrouter;
export enum MiningTaskType {
    GameInterestMining = 1,
    PanEntertainmentMining = 2,
    LabelSystemMining = 3,
    CategoryExtraction = 4,
    AccurateModeling = 5,
    KnowledgeGraph = 6,
    SocialDiffusion = 7,
    UploadNumberPackage = 8,
    RefinedExtractionTask = 12
}

export const components = {
    GameInterestMining,
    PanEntertainmentMining,
    LabelSystemMining,
    CategoryExtraction,
    AccurateModeling,
    SocialDiffusion,
    KnowledgeGraph,
    UploadNumberPackage
};

const handleBaseFormData = (taskData: BaseFormType): BaseFormType => {
    const { PackageTypeId, Limited, QueryKeyWords } = taskData;
    const [StartTime = null, EndTime = null] = taskData.DataSourceTime || [];
    const Params: Record<string, any> = {};
    Params.StartTime = StartTime && dayjs(StartTime).format('YYYYMM');
    Params.EndTime = EndTime && dayjs(EndTime).format('YYYYMM');
    Params.AccountType = PackageTypeId ? PackageTypeId[0] + '' : null;
    Params.Limited = Limited;
    Params.QueryKeyWords = QueryKeyWords;

    taskData.Params = Params;
    return taskData;
};

const BaseFormJobType = [MiningTaskType.GameInterestMining, MiningTaskType.PanEntertainmentMining, MiningTaskType.LabelSystemMining];
export const submitTask = (taskData: TaskFormConfigType, type: OperationType): UserMiningPromise => {
    let taskDetail!: TaskFormConfigType;
    taskDetail = taskData;

    taskDetail.Limited = handleRefinedExtractionData(taskData.Limited);

    if (taskDetail.JobType && BaseFormJobType.includes(taskDetail.JobType)) taskDetail = handleBaseFormData(taskDetail as BaseFormType);
    else if (MiningTaskType.CategoryExtraction === taskDetail.JobType) taskDetail = handleCategoryData(taskDetail as CategoryExtractionMining);
    else if (MiningTaskType.AccurateModeling === taskDetail.JobType) taskDetail = handleAccurateModelingData(taskDetail as AccurateModelingMining);
    else if (MiningTaskType.KnowledgeGraph === taskDetail.JobType) taskDetail = handleKnowledgeGraphData(taskDetail as KnowledgeGraphMining);
    else if (MiningTaskType.RefinedExtractionTask === taskDetail.JobType) taskDetail = handleRefinedExtractionTaskData(taskDetail as RefinedExtractionTask);

    return handleSubmit(taskData, type);
};

const handleSubmit = (taskData: TaskFormConfigType, type: OperationType): UserMiningPromise => {
    return new Promise((resolve) => {
        if (type === OperationType.commitJob) {
            return commitMany(taskData).then(result => {
                if (result.isSuccess) {
                    ElMessage.success('提交成功!');
                    router.push('/createSuccess');
                } else ElMessage.error(result.Errmsg || '提交失败!');

                console.log('=========Commit', result);
                resolve(result);
            });
        } else {
            saveJob(taskData).then(result => {
                if (result.isSuccess) {
                    router.push('/createSuccess');
                    ElMessage.success('保存成功!');
                } else ElMessage.error(result.Errmsg || '保存失败!');

                console.log('=========Save', result);
                resolve(result);
            });
        }
    });
};

const handleCategoryData = (taskData: CategoryExtractionMining): CategoryExtractionMining => {
    const { PackageTypeId, Limited, GameCategoryId, PlatformSystemId } = taskData;
    const Params: Record<string, any> = {};

    Params.AccountType = (PackageTypeId && PackageTypeId[0]) + '' || null;
    Params.Limited = Limited;
    Params.QueryKeyWords = [GameCategoryId + ''];
    Params.SystemPlatform = PlatformSystemId;

    taskData.Params = Params;
    return taskData;
};

const handleAccurateModelingData = (taskData: AccurateModelingMining): AccurateModelingMining => {
    const { AccountTypeT, Limited, PackageIDs } = taskData;
    const Params: Record<string, any> = {};

    Params.AccountType = AccountTypeT ? AccountTypeT + '' : null;
    Params.Limited = Limited;
    Params.PackageIDs = PackageIDs;
    taskData.Params = Params;
    return taskData;
};

const handleKnowledgeGraphData = (taskData: KnowledgeGraphMining): KnowledgeGraphMining => {
    const { Limited, AccountTypeT } = taskData;
    const Params: Record<string, any> = {};

    Params.AccountType = AccountTypeT ? AccountTypeT + '' : null;
    Params.Limited = Limited;

    taskData.Params = Params;
    return taskData;
};

const handleRefinedExtractionTaskData = (taskData: RefinedExtractionTask): RefinedExtractionTask => {
    const { PackageIDs, Limited } = taskData;
    const Params: Record<string, any> = {};
    Params.PackageIDs = PackageIDs;
    Params.Limited = Limited;

    taskData.Params = Params;
    return taskData;
};

const handleRefinedExtractionData = (limited: RefinedExtractionConfig): RefinedExtractionConfig => {
    const { Range, PlatformSystem, AreaType, Province, City, CityLevel } = limited;
    const [StartTime = null, EndTime = null] = Range || [];
    // 大盘时间
    limited.StartTime = StartTime && dayjs(StartTime).format('YYYYMMDD');
    limited.EndTime = EndTime && dayjs(EndTime).format('YYYYMMDD');

    // 平台分布
    limited.Dapan = PlatformSystem ? [PlatformSystem] : [];

    // 地域
    limited.Province = AreaType === AreaTypeEnum.Province ? Province : [];
    limited.City = AreaType === AreaTypeEnum.City ? City : [];
    limited.CityLevel = AreaType === AreaTypeEnum.CityLevel ? CityLevel : 0;
    return limited;
};
export const getTaskDetail = async (packageId: number, queryScene?: number): Promise<JobDetailResData | null> => {
    const params: GetJobDetailData = {
        PackageID: packageId
    };
    if (queryScene) {
        params.QueryScene = queryScene;
    }
    const result = await getJobDetail(params);
    let taskDetail = null;
    if (result.isSuccess) {
        taskDetail = result.Data;
    }
    taskDetail && (taskDetail = handleTaskDetail(taskDetail));
    return (taskDetail || null) as JobDetailResData | null;
};

const handleTaskDetail = (taskDetail: JobDetailResData) => {
    let data!: TaskFormConfigType;
    if ([MiningTaskType.GameInterestMining, MiningTaskType.PanEntertainmentMining, MiningTaskType.LabelSystemMining].includes(taskDetail.JobType)) data = handleDetailBaseDate();
    else if (taskDetail.JobType === MiningTaskType.CategoryExtraction) data = handleDetailCategoryExtraction();
    else if (taskDetail.JobType === MiningTaskType.AccurateModeling || taskDetail.JobType === MiningTaskType.SocialDiffusion) data = handleDetailAccurateModeling();
    else if (taskDetail.JobType === MiningTaskType.KnowledgeGraph) data = handleDetailKnowledgeGraph();
    else return taskDetail;
    // data.Limited = handleDetailRefinedExtractionData(taskDetail.Params?.Limited || null, data?.Limited || null)
    return handleDataObj(taskDetail, data);
};

const handleDetailRefinedExtractionData = (sourceLimited: RefinedExtractionConfig | null, targetLimited: RefinedExtractionConfig): RefinedExtractionConfig => {
    const { StartTime, EndTime, Dapan = [] } = sourceLimited || {};
    const keys = Object.keys(targetLimited || {});

    if (!sourceLimited || !targetLimited) return targetLimited;
    keys.forEach((key) => {
        if (key === 'Range') {
            targetLimited[key] = (StartTime && EndTime) ? [StartTime, EndTime] : [];
        } else if (key === 'PlatformSystem') {
            targetLimited[key] = Dapan[0] || null;
        } else if (key === 'City' || key === 'CityLevel' || key === 'Province') {
            if (key === 'City' && sourceLimited[key].length > 0) targetLimited.AreaType = 2;
            else if (key === 'CityLevel' && sourceLimited[key]) targetLimited.AreaType = 3;
            else if (key === 'Province' && sourceLimited[key].length > 0) targetLimited.AreaType = 1;

            (targetLimited as any)[key] = (sourceLimited as any)[key];
        } else {
            if (key in sourceLimited) (targetLimited as any)[key] = (sourceLimited as any)[key];
        }
    });
    return targetLimited;
};

const handleDetailBaseDate = (): GameInterestMiningConfig => {
    return new GameInterestMiningConfig();
};

const handleDetailCategoryExtraction = (): CategoryExtractionMining => {
    return new CategoryExtractionMining();
};

const handleDetailAccurateModeling = (): AccurateModelingMining => {
    return new AccurateModelingMining();
};

const handleDetailKnowledgeGraph = (): KnowledgeGraphMining => {
    return new KnowledgeGraphMining();
};

function handleDataObj (sourceObj: JobDetailResData, targetObj: TaskFormConfigType): TaskFormConfigType
function handleDataObj (sourceObj: JobDetailResData, targetObj: Record<string, any>): Record<string, any> {
    const keys = Object.keys(targetObj);
    const { Params } = sourceObj;
    let { StartTime = null, EndTime = null, AccountType = 0, QueryKeyWords = [], SystemPlatform, PackageIDs } = Params || {};
    if (StartTime) StartTime = handleTime(StartTime);
    if (EndTime) EndTime = handleTime(EndTime);

    keys.forEach((key: string) => {
        if (key === 'DataSourceTime') targetObj[key] = (StartTime && EndTime) ? [StartTime, EndTime] : [];
        else if (key === 'PackageTypeId') targetObj[key] = [Number(AccountType)];
        else if (key === 'QueryKeyWords') targetObj[key] = QueryKeyWords;
        else if (key === 'GameCategoryId') targetObj[key] = QueryKeyWords?.[0] ? Number(QueryKeyWords[0]) : null;
        else if (key === 'PlatformSystemId') targetObj[key] = Number(SystemPlatform);
        else if (key === 'PackageIDs') targetObj[key] = PackageIDs;
        else if (key === 'AccountTypeT') targetObj[key] = Number(AccountType);
        else if (key === 'Limited') targetObj[key] = handleDetailRefinedExtractionData(sourceObj.Params?.Limited || null, targetObj?.Limited || null);
        else targetObj[key] = sourceObj[key] || '';
    });
    return targetObj;
}
const handleTime = (time = ''): string => {
    let tmps: string[] = [];
    tmps = time.split('');
    tmps.splice(4, 0, '-');
    return tmps.join('');
};
